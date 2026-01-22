import mongoose from "mongoose";
import { Session } from "../models/study-session.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandlerWrapper } from "../utils/Async-handler.js";

export const studySessionStart = asyncHandlerWrapper(async (req, res) => {
    const { topicTag } = req.body
    const userId = req.user.id

    const user = await User.findOneAndUpdate(
        {
            _id: userId,
            "activeSession.startTime": null
        },
        {
            $set: {
                "activeSession.startTime": new Date(),
                "activeSession.topicTag": topicTag || null
            }
        },
        { new: true }
    )

    if (!user) {
        throw new ApiError(409, "Study session already running")
    }

    return res.status(200)
        .json(
            new ApiResponse(200, user.activeSession, "Session Started")
        )
})

export const studySessionStop = asyncHandlerWrapper(async (req, res) => {
    const userId = req.user.id

    const user = await User.findById(userId).select("-password -refreshToken")

    if (!user.activeSession.startTime) {
        throw new ApiError(400, "No active study session to stop")
    }
    const startTime = user.activeSession.startTime
    const endTime = new Date()
    const duration = Math.floor((endTime - startTime) / 1000)

    const studySession = await Session.create({
        startTime,
        endTime,
        duration,
        topicTag: user.activeSession.topicTag,
        sessionDate: new Date(),
        owner: userId
    })

    await User.findByIdAndUpdate(userId, {
        $set: {
            "activeSession.startTime": null,
            "activeSession.topicTag": null
        }
    })

    return res.status(200)
        .json(
            new ApiResponse(200, studySession, "Study session completed successfully")
        )
})

export const getStudySession = asyncHandlerWrapper(async (req, res) => {
    const userId = req.user.id
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 10
    const offset = (page - 1) * limit
    const sessionDate = req.query.sessionDate
    const topicTag = req.query.topic?.trim()

    const date = new Date(sessionDate)
    date.setHours(0, 0, 0, 0)

    const nextDate = new Date(sessionDate)
    nextDate.setDate(date.getDate() + 1)

    const filter = { owner: userId }
    if (sessionDate) {
        filter.sessionDate = {
            $gte: date,
            $lt: nextDate
        }
    }
    if (topicTag) {
        filter.topicTag = { $regex: topicTag, $options: "i" }
    }

    const userSessions = await Session.find(filter)
        .sort({ startTime: -1 })
        .skip(offset)
        .limit(limit)

    const totalDocuments = await Session.countDocuments(filter)
    const totalPages = Math.ceil(totalDocuments / limit)

    return res.status(200)
        .json(
            new ApiResponse(200, {
                "Sessions": userSessions,
                "Pagination": {
                    "page": page,
                    "limit": limit,
                    "totalSessions": totalDocuments,
                    "totalPages": totalPages
                }
            })
        )
})

export const getStats = asyncHandlerWrapper(async (req, res) => {
    const userId = new mongoose.Types.ObjectId(req.user.id)
    let statsdate = req.query.date
    if (!statsdate) {
        statsdate = new Date()
    }
    const date = new Date(statsdate)
    date.setHours(0, 0, 0, 0)
    const nextDate = new Date(date)
    nextDate.setDate(date.getDate() + 1)

    const filter = { owner: userId }
    if (statsdate) {
        filter.startTime = {
            $gte: date,
            $lt: nextDate
        }
    }

    const statsData = await Session.aggregate([
        { $match: filter },
        {
            $group: {
                _id: null,
                totalStudyTime: { $sum: "$duration" },
                totalSessions: { $sum: 1 }
            }
        },
        {
            $project: {
                _id: 0,
                totalStudyTime: 1,
                totalSessions: 1
            }
        }
    ])

    const stats = statsData[0] || { totalStudyTime: 0, totalSessions: 0 }

    return res.status(200)
        .json(
            new ApiResponse(200, stats, "stats fetched successfully")
        )
})

export const getStreak = asyncHandlerWrapper(async (req, res) => {
    const userId = new mongoose.Types.ObjectId(req.user.id)

    const streakDates = await Session.aggregate([
        {
            $match: {
                owner: userId
            }
        },
        {
            $project: {
                day: {
                    $dateTrunc: { // takes full date remove time and return the data in unit form
                        date: "$startTime",
                        unit: "day"
                    }
                }
            }
        },
        {
            $group: {
                _id: "$day"
            }
        },
        {
            $sort: {
                _id: -1
            }
        }
    ])

    const dates = []
    let streak = 0

    for (let i = 0; i < streakDates.length; i++) {
        dates.push(new Date(streakDates[i]._id))
    }

    const today = new Date()
    const todayUTC = new Date(Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate()
    ))

    if (dates.length === 0) {
        streak = 0
    }

    if (todayUTC.getTime() === dates[0].getTime()) {
        const ONE_DAY = 24 * 60 * 60 * 1000
        streak = 1
        for (let i = 1; i < dates.length; i++) {
            const prev = dates[i - 1]
            const curr = dates[i]

            if (prev.getTime() - curr.getTime() === ONE_DAY) {
                streak++
            } else {
                break
            }
        }
        console.log("streak:" + streak);

    } else {
        streak = 0
    }
})
