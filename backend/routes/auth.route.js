import express from 'express'
import rateLimit from 'express-rate-limit'
import {
    loginUser, logoutUser, refreshAccessToken, registerUser,
    forgotPasswordSendOtp, forgotPasswordVerifyOtp, resetPassword,
} from '../controllers/auth.controller.js'
import { verifyJWT } from '../middleware/auth.middleware.js'
import { validate, registerSchema, loginSchema } from '../middleware/validate.middleware.js'

const authRouter = express.Router()

// ── Rate limiters ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false,
    message: { success: false, message: "Too many requests. Please try again in 15 minutes." },
})
const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false,
    message: { success: false, message: "Too many OTP requests. Please try again in 15 minutes." },
})
const refreshLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false,
    message: { success: false, message: "Too many refresh attempts. Please try again shortly." },
})

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication & token management
 */

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email or username already in use
 *       429:
 *         description: Rate limit exceeded
 */
authRouter.post('/register', authLimiter, validate(registerSchema), registerUser)

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Sign in with email & password
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Logged in — also sets refreshToken HttpOnly cookie
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid email or password
 *       429:
 *         description: Rate limit exceeded
 */
authRouter.post('/login', authLimiter, validate(loginSchema), loginUser)

/**
 * @swagger
 * /api/v1/auth/logout:
 *   get:
 *     summary: Logout — invalidates refresh token & clears cookie
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Unauthorised
 */
authRouter.get('/logout', verifyJWT, logoutUser)

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   get:
 *     summary: Get a new access token using the refresh token cookie
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       200:
 *         description: New access token
 *       401:
 *         description: Refresh token missing, expired, or revoked
 */
authRouter.get('/refresh', refreshLimiter, refreshAccessToken)

/**
 * @swagger
 * /api/v1/auth/forgot-password/send-otp:
 *   post:
 *     summary: "Forgot password – Step 1: send OTP to email"
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: dhruv@codearena.io
 *     responses:
 *       200:
 *         description: OTP sent (always 200 to prevent email enumeration)
 *       429:
 *         description: Rate limit exceeded
 */
authRouter.post('/forgot-password/send-otp', otpLimiter, forgotPasswordSendOtp)

/**
 * @swagger
 * /api/v1/auth/forgot-password/verify-otp:
 *   post:
 *     summary: "Forgot password – Step 2: verify OTP, receive resetToken"
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               otp:
 *                 type: string
 *                 example: "482916"
 *     responses:
 *       200:
 *         description: OTP verified — resetToken returned (valid 10 min)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     resetToken:
 *                       type: string
 *       400:
 *         description: OTP invalid or expired
 */
authRouter.post('/forgot-password/verify-otp', otpLimiter, forgotPasswordVerifyOtp)

/**
 * @swagger
 * /api/v1/auth/forgot-password/reset:
 *   post:
 *     summary: "Forgot password – Step 3: set new password using resetToken"
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [resetToken, newPassword]
 *             properties:
 *               resetToken:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Token expired or invalid
 */
authRouter.post('/forgot-password/reset', resetPassword)

export default authRouter