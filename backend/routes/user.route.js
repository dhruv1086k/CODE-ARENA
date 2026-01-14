import express from "express"
import { verifyJWT } from "../middleware/auth.middleware.js"
import { getUserData } from "../controllers/user.controller.js"

const UserRouter = express.Router()

// ===================== PROTECTED USER ROUTES =====================
UserRouter.route("/me").get(verifyJWT, getUserData)

export default UserRouter