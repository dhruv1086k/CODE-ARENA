import express from "express"
import { getUserData } from "../middleware/user.middleware.js"
import { verifyJWT } from "../middleware/auth.middleware.js"

const UserRouter = express.Router()

// ===================== PROTECTED USER ROUTES =====================
UserRouter.route("/me").get(verifyJWT, getUserData)

export default UserRouter