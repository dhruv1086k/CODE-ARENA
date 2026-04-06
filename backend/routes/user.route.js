import express from 'express'
import rateLimit from 'express-rate-limit'
import { verifyJWT } from '../middleware/auth.middleware.js'
import { getUserData, changePassword, sendChangePasswordOtp } from '../controllers/user.controller.js'
import { validate, changePasswordSchema } from '../middleware/validate.middleware.js'

const UserRouter = express.Router()

const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false,
    message: { success: false, message: "Too many OTP requests. Please try again in 15 minutes." },
})

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile & account management
 */

/**
 * @swagger
 * /api/v1/users/me:
 *   get:
 *     summary: Get current user's profile
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorised
 */
UserRouter.get('/me', verifyJWT, getUserData)

/**
 * @swagger
 * /api/v1/users/send-change-password-otp:
 *   post:
 *     summary: "Change password – Step 1: send OTP to the user's registered email"
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: OTP sent to registered email
 *       401:
 *         description: Unauthorised
 *       429:
 *         description: Rate limit exceeded
 */
UserRouter.post('/send-change-password-otp', verifyJWT, otpLimiter, sendChangePasswordOtp)

/**
 * @swagger
 * /api/v1/users/change-password:
 *   patch:
 *     summary: "Change password – Step 2: verify OTP + current password, set new password"
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [otp, currentPassword, newPassword]
 *             properties:
 *               otp:
 *                 type: string
 *                 example: "391827"
 *               currentPassword:
 *                 type: string
 *                 example: OldPass123!
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 example: NewPass456!
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: OTP invalid/expired, or current password incorrect
 *       401:
 *         description: Unauthorised
 */
UserRouter.patch('/change-password', verifyJWT, changePassword)

export default UserRouter