import express from 'express'
import { loginUser, logoutUser, refreshToken, registerUser } from '../controllers/user.controller.js'
import { verifyJWT } from '../middleware/auth.middleware.js'

const UserRouter = express.Router()

UserRouter.route("/register").post(registerUser)
UserRouter.route("/login").post(loginUser)

// ================== PROTECTED ROUTES ================== 
UserRouter.route("/logout").get(verifyJWT, logoutUser)
UserRouter.route("/refresh").get(refreshToken)

export default UserRouter