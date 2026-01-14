import express from 'express'
import { loginUser, logoutUser, refreshToken, registerUser } from '../controllers/auth.controller.js'
import { verifyJWT } from '../middleware/auth.middleware.js'

const authRouter = express.Router()

authRouter.route("/register").post(registerUser)
authRouter.route("/login").post(loginUser)

// ================== PROTECTED ROUTES ================== 
authRouter.route("/logout").get(verifyJWT, logoutUser)
authRouter.route("/refresh").get(refreshToken)

export default authRouter