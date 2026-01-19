import { Session } from "../models/study-session.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandlerWrapper } from "../utils/Async-handler.js";

export const studySessionStart = asyncHandlerWrapper(async (req, res) => {
    const { topicTag } = req.body
    const userId = req.user.id

    const user = await User.findById(userId).select("-password -refreshToken")
    if (user.activeSession.startTime) {
        throw new ApiError(401, "Study Session already exists")
    }

    user.activeSession.startTime = new Date()
    if (topicTag) {
        user.activeSession.topicTag = topicTag
    }

    await user.save({ validateBeforeSave: false })

    return res.status(200)
        .json(
            new ApiResponse(200, user.activeSession, "Session Started")
        )
})

export const studySessionStop = asyncHandlerWrapper(async (req, res) => {
    const userId = req.user.id

    const user = await User.findById(userId).select("-password -refreshToken")

    if (!user.studySession.startTime) {
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

    user.activeSession.startTime === null
    user.activeSession.topicTag === null
    await studySession.save({ validateBeforeSave: false })

    return res.status(200)
        .json(
            new ApiResponse(200, studySession, "Study session completed successfully")
        )
})