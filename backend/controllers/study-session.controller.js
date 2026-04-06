import mongoose from "mongoose";
import { Session } from "../models/study-session.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandlerWrapper } from "../utils/Async-handler.js";
import { cacheGet, cacheSet, cacheDelPattern } from "../config/redis.js";

// ── Cache TTLs (seconds) ──────────────────────────────────────────────────────
const TTL_STATS   = 60        // stats refresh every minute (changes after a session stops)
const TTL_STREAK  = 5 * 60   // streak: 5 minutes
const TTL_HEATMAP = 10 * 60  // heatmap: 10 minutes (slow-moving historical data)

// Cache key helpers
const cacheKey = (type, userId, suffix = '') => `${type}:${userId}${suffix ? ':' + suffix : ''}`

// ── Start Session ─────────────────────────────────────────────────────────────
export const studySessionStart = asyncHandlerWrapper(async (req, res) => {
    const { topicTag } = req.body            // already validated by Zod middleware
    const userId = req.user._id

    const user = await User.findOneAndUpdate(
        { _id: userId, "activeSession.startTime": null },
        { $set: { "activeSession.startTime": new Date(), "activeSession.topicTag": topicTag || null } },
        { new: true }
    )

    if (!user) throw new ApiError(409, "A study session is already running. Stop it first.")

    return res.status(200).json(new ApiResponse(200, user.activeSession, "Session started"))
})

// ── Stop Session ──────────────────────────────────────────────────────────────
export const studySessionStop = asyncHandlerWrapper(async (req, res) => {
    const userId = req.user._id

    const user = await User.findById(userId).select("-password -refreshToken")

    if (!user.activeSession?.startTime) {
        throw new ApiError(400, "No active study session to stop")
    }

    const startTime = user.activeSession.startTime
    const endTime   = new Date()
    const duration  = Math.floor((endTime - startTime) / 1000)

    const studySession = await Session.create({
        startTime,
        endTime,
        duration,
        topicTag: user.activeSession.topicTag || undefined,
        sessionDate: new Date(),
        owner: userId,
    })

    await User.findByIdAndUpdate(userId, {
        $set: { "activeSession.startTime": null, "activeSession.topicTag": null },
    })

    // Invalidate cached stats/streak/heatmap for this user since a new session was recorded
    await cacheDelPattern(`stats:${userId}:*`)
    await cacheDelPattern(`streak:${userId}`)
    await cacheDelPattern(`heatmap:${userId}`)

    return res.status(200).json(new ApiResponse(200, studySession, "Study session completed successfully"))
})

// ── Get Sessions (paginated list with filters) ────────────────────────────────
export const getStudySession = asyncHandlerWrapper(async (req, res) => {
    const userId = req.user._id
    const page  = Math.max(1, Number(req.query.page)  || 1)
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10))
    const offset = (page - 1) * limit
    const sessionDate = req.query.sessionDate
    const topicQuery  = (req.query.topic || '').trim()

    const filter = { owner: userId }

    if (sessionDate) {
        const date = new Date(sessionDate)
        date.setHours(0, 0, 0, 0)
        const nextDate = new Date(date)
        nextDate.setDate(date.getDate() + 1)
        filter.sessionDate = { $gte: date, $lt: nextDate }
    }

    if (topicQuery) {
        filter.topicTag = { $regex: topicQuery, $options: 'i' }
    }

    const [userSessions, totalDocuments] = await Promise.all([
        Session.find(filter).sort({ startTime: -1 }).skip(offset).limit(limit),
        Session.countDocuments(filter),
    ])

    return res.status(200).json(new ApiResponse(200, {
        Sessions: userSessions,
        Pagination: {
            page,
            limit,
            totalSessions: totalDocuments,
            totalPages: Math.ceil(totalDocuments / limit),
        },
    }, "Sessions fetched successfully"))
})

// ── Stats (today's total time + session count) — CACHED ──────────────────────
export const getStats = asyncHandlerWrapper(async (req, res) => {
    const userId    = new mongoose.Types.ObjectId(req.user.id)
    const dateParam = req.query.date || new Date().toISOString().slice(0, 10)

    const key = cacheKey('stats', userId.toString(), dateParam)

    // Try cache first
    const cached = await cacheGet(key)
    if (cached) {
        return res.status(200).json(new ApiResponse(200, cached, "Stats fetched successfully (cached)"))
    }

    const date = new Date(dateParam)
    date.setHours(0, 0, 0, 0)
    const nextDate = new Date(date)
    nextDate.setDate(date.getDate() + 1)

    const statsData = await Session.aggregate([
        { $match: { owner: userId, startTime: { $gte: date, $lt: nextDate } } },
        { $group: { _id: null, totalStudyTime: { $sum: "$duration" }, totalSessions: { $sum: 1 } } },
        { $project: { _id: 0, totalStudyTime: 1, totalSessions: 1 } },
    ])

    const stats = statsData[0] || { totalStudyTime: 0, totalSessions: 0 }

    await cacheSet(key, stats, TTL_STATS)

    return res.status(200).json(new ApiResponse(200, stats, "Stats fetched successfully"))
})

// ── Streak (current + longest) — CACHED ──────────────────────────────────────
export const getStreak = asyncHandlerWrapper(async (req, res) => {
    const userId = new mongoose.Types.ObjectId(req.user.id)

    const key = cacheKey('streak', userId.toString())

    const cached = await cacheGet(key)
    if (cached) {
        return res.status(200).json(new ApiResponse(200, cached, "Streak fetched successfully (cached)"))
    }

    // Get unique activity days, sorted descending
    const streakDates = await Session.aggregate([
        { $match: { owner: userId } },
        { $project: { day: { $dateTrunc: { date: "$startTime", unit: "day" } } } },
        { $group: { _id: "$day" } },
        { $sort: { _id: -1 } },
    ])

    // BUG FIX #3: replaced the bare `return 0` with a proper empty-state response
    if (streakDates.length === 0) {
        const empty = { currentStreak: 0, longestStreak: 0, lastActiveDate: null }
        await cacheSet(key, empty, TTL_STREAK)
        return res.status(200).json(new ApiResponse(200, empty, "Streak fetched successfully"))
    }

    const ONE_DAY = 24 * 60 * 60 * 1000
    const dates = streakDates.map(d => new Date(d._id))

    const today = new Date()
    const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()))

    // ── Current streak (must include today or yesterday) ─────────────────────
    let currentStreak = 0
    const mostRecent = dates[0].getTime()
    const yesterday  = todayUTC.getTime() - ONE_DAY

    if (mostRecent === todayUTC.getTime() || mostRecent === yesterday) {
        currentStreak = 1
        for (let i = 1; i < dates.length; i++) {
            if (dates[i - 1].getTime() - dates[i].getTime() === ONE_DAY) {
                currentStreak++
            } else {
                break
            }
        }
    }

    // BUG FIX #4: longest streak — longStreak was never updated inside the loop
    let longestStreak = 1
    let runningStreak = 1
    for (let i = 1; i < dates.length; i++) {
        if (dates[i - 1].getTime() - dates[i].getTime() === ONE_DAY) {
            runningStreak++
            longestStreak = Math.max(longestStreak, runningStreak)
        } else {
            runningStreak = 1
        }
    }
    // Edge-case: single day of activity
    longestStreak = Math.max(longestStreak, currentStreak)

    const result = {
        currentStreak,
        longestStreak,
        lastActiveDate: dates[0] || null,
    }

    await cacheSet(key, result, TTL_STREAK)

    return res.status(200).json(new ApiResponse(200, result, "Streak fetched successfully"))
})

// ── Heatmap (last 90 days session counts per day) — CACHED ───────────────────
export const getHeatMap = asyncHandlerWrapper(async (req, res) => {
    const userId = new mongoose.Types.ObjectId(req.user.id)

    const key = cacheKey('heatmap', userId.toString())

    const cached = await cacheGet(key)
    if (cached) {
        return res.status(200).json(new ApiResponse(200, cached, "Heatmap fetched successfully (cached)"))
    }

    // 90-day window
    const since = new Date()
    since.setDate(since.getDate() - 90)
    since.setHours(0, 0, 0, 0)

    const heatMap = await Session.aggregate([
        { $match: { owner: userId, startTime: { $gte: since } } },
        { $project: { day: { $dateTrunc: { date: "$startTime", unit: "day" } } } },
        { $group: { _id: "$day", count: { $sum: 1 } } },
        { $project: { day: "$_id", _id: 0, count: 1 } },
        { $sort: { day: 1 } },
    ])

    await cacheSet(key, heatMap, TTL_HEATMAP)

    return res.status(200).json(new ApiResponse(200, heatMap, "Heatmap fetched successfully"))
})