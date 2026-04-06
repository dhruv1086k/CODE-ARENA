import { User } from "../models/user.model.js";
import { Otp } from "../models/otp.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandlerWrapper } from "../utils/Async-handler.js";
import { sendOtpEmail } from "../utils/email.js";
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

// ── Helper: generate a cryptographically random 6-digit OTP ──────────────────
const generateOtp = () => String(Math.floor(100000 + crypto.randomInt(900000)))

// ── Helper: generate token pair ──────────────────────────────────────────────
const generateAccessAndRefreshToken = async (userId) => {
    const user = await User.findById(userId)
    if (!user) throw new ApiError(500, "User not found during token generation")

    const accessToken = user.generateAccessToken()
    const refreshToken = user.generateRefreshToken()

    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })

    return { accessToken, refreshToken }
}

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
}

// ── Register ──────────────────────────────────────────────────────────────────
export const registerUser = asyncHandlerWrapper(async (req, res) => {
    const { name, username, email, password } = req.body

    const existingUser = await User.findOne({ $or: [{ email }, { username }] })
    if (existingUser) {
        throw new ApiError(409, existingUser.email === email
            ? "An account with this email already exists"
            : "This username is already taken"
        )
    }

    const user = await User.create({ name, email, username, password })
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)
    const createdUser = await User.findById(user._id).select("-password -refreshToken")
    if (!createdUser) throw new ApiError(500, "Something went wrong while registering user")

    return res
        .status(201)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(new ApiResponse(201, { user: createdUser, accessToken, refreshToken }, "User created successfully"))
})

// ── Login ─────────────────────────────────────────────────────────────────────
export const loginUser = asyncHandlerWrapper(async (req, res) => {
    const { email, password } = req.body

    const user = await User.findOne({ email })
    if (!user) throw new ApiError(401, "Invalid email or password")

    const isMatch = await user.isPasswordCorrect(password)
    if (!isMatch) throw new ApiError(401, "Invalid email or password")

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)
    const loggedUser = await User.findById(user._id).select("-password -refreshToken")

    return res
        .status(200)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(new ApiResponse(200, { user: loggedUser, accessToken, refreshToken }, "Logged in successfully"))
})

// ── Logout ────────────────────────────────────────────────────────────────────
export const logoutUser = asyncHandlerWrapper(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        { $set: { refreshToken: "" } },
        { new: true }
    )
    return res
        .status(200)
        .clearCookie("refreshToken", cookieOptions)
        .json(new ApiResponse(200, {}, "Logged out successfully"))
})

// ── Refresh Access Token ──────────────────────────────────────────────────────
export const refreshAccessToken = asyncHandlerWrapper(async (req, res) => {
    const token = req.cookies?.refreshToken
    if (!token) throw new ApiError(401, "Refresh token not found")

    let decodedToken
    try {
        decodedToken = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET_KEY)
    } catch {
        throw new ApiError(401, "Refresh token is expired or invalid")
    }

    const user = await User.findById(decodedToken._id).select("-password")
    if (!user) throw new ApiError(401, "User not found")
    if (token !== user.refreshToken) throw new ApiError(401, "Refresh token has already been used or revoked")

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

    return res
        .status(200)
        .cookie("refreshToken", refreshToken, cookieOptions)
        .json(new ApiResponse(200, { accessToken }, "Access token refreshed successfully"))
})

// ── Forgot Password: Step 1 — send OTP to email ───────────────────────────────
export const forgotPasswordSendOtp = asyncHandlerWrapper(async (req, res) => {
    const { email } = req.body
    if (!email) throw new ApiError(400, "Email is required")

    const user = await User.findOne({ email: email.toLowerCase().trim() })

    // Always return 200 — don't reveal whether email exists (security best practice)
    if (!user) {
        return res.status(200).json(
            new ApiResponse(200, {}, "If this email is registered, an OTP has been sent.")
        )
    }

    // Delete any existing OTPs for this email/type
    await Otp.deleteMany({ email: user.email, type: 'forgot_password' })

    const otp = generateOtp()
    await Otp.create({ email: user.email, otp, type: 'forgot_password' })

    await sendOtpEmail(user.email, otp, 'forgot_password')

    return res.status(200).json(
        new ApiResponse(200, {}, "If this email is registered, an OTP has been sent.")
    )
})

// ── Forgot Password: Step 2 — verify OTP, return short-lived reset token ──────
export const forgotPasswordVerifyOtp = asyncHandlerWrapper(async (req, res) => {
    const { email, otp } = req.body
    if (!email || !otp) throw new ApiError(400, "Email and OTP are required")

    const record = await Otp.findOne({
        email: email.toLowerCase().trim(),
        type: 'forgot_password',
    })

    if (!record) throw new ApiError(400, "OTP has expired or is invalid. Please request a new one.")

    const isValid = await record.verifyOtp(otp)
    if (!isValid) throw new ApiError(400, "Incorrect OTP. Please try again.")

    // OTP is valid — delete it so it can't be reused
    await record.deleteOne()

    // Issue a short-lived (10 min) JWT reset token
    const resetToken = jwt.sign(
        { email: email.toLowerCase().trim(), purpose: 'password_reset' },
        process.env.ACCESS_TOKEN_SECRET_KEY,
        { expiresIn: '10m' }
    )

    return res.status(200).json(
        new ApiResponse(200, { resetToken }, "OTP verified. Use resetToken to set a new password.")
    )
})

// ── Forgot Password: Step 3 — reset password using reset token ────────────────
export const resetPassword = asyncHandlerWrapper(async (req, res) => {
    const { resetToken, newPassword } = req.body
    if (!resetToken || !newPassword) throw new ApiError(400, "resetToken and newPassword are required")
    if (newPassword.length < 6) throw new ApiError(400, "Password must be at least 6 characters")

    let decoded
    try {
        decoded = jwt.verify(resetToken, process.env.ACCESS_TOKEN_SECRET_KEY)
    } catch {
        throw new ApiError(400, "Reset token is expired or invalid. Please restart the process.")
    }

    if (decoded.purpose !== 'password_reset') throw new ApiError(400, "Invalid reset token")

    const user = await User.findOne({ email: decoded.email })
    if (!user) throw new ApiError(404, "User not found")

    user.password = newPassword
    await user.save()       // pre-save hook hashes the password

    return res.status(200).json(
        new ApiResponse(200, {}, "Password reset successfully. You can now sign in.")
    )
})