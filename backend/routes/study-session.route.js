import express from "express"
import { getStudySession, studySessionStart, studySessionStop } from "../controllers/study-session.controller.js"
import { verifyJWT } from "../middleware/auth.middleware.js"

const studySessionRouter = express.Router()

studySessionRouter.route("/").get(verifyJWT, getStudySession)
studySessionRouter.route("/start").post(verifyJWT, studySessionStart)
studySessionRouter.route("/stop").post(verifyJWT, studySessionStop)

export default studySessionRouter