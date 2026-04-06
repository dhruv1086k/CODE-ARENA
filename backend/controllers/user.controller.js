import { User } from "../models/user.model.js";
import { Otp } from "../models/otp.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandlerWrapper } from "../utils/Async-handler.js";
import { sendOtpEmail } from "../utils/email.js";
import crypto from 'crypto'

const generateOtp = () => String(Math.floor(100000 + crypto.randomInt(900000)))

// ── Get current user's profile ────────────────────────────────────────────────
export const getUserData = asyncHandlerWrapper(async (req, res) => {
    return res.status(200).json(
        new ApiResponse(200, req.user, "User data fetched successfully")
    )
})

// ── Change Password: Step 1 — send OTP to the user's registered email ─────────
export const sendChangePasswordOtp = asyncHandlerWrapper(async (req, res) => {
    const user = req.user                           // populated by verifyJWT
    const email = user.email

    // Delete any lingering change_password OTPs for this user
    await Otp.deleteMany({ email, type: 'change_password' })

    const otp = generateOtp()
    await Otp.create({ email, otp, type: 'change_password' })

    await sendOtpEmail(email, otp, 'change_password')

    return res.status(200).json(
        new ApiResponse(200, {}, `OTP sent to ${email}. It expires in 10 minutes.`)
    )
})

// ── Change Password: Step 2 — verify OTP + set new password ──────────────────
export const changePassword = asyncHandlerWrapper(async (req, res) => {
    const { otp, currentPassword, newPassword } = req.body
    const userId = req.user._id

    if (!otp || !currentPassword || !newPassword) {
        throw new ApiError(400, "OTP, current password, and new password are required")
    }
    if (newPassword.length < 6) {
        throw new ApiError(400, "New password must be at least 6 characters")
    }

    // Fetch user WITH password for bcrypt comparison
    const user = await User.findById(userId)
    if (!user) throw new ApiError(404, "User not found")

    // 1. Verify current password
    const isMatch = await user.isPasswordCorrect(currentPassword)
    if (!isMatch) throw new ApiError(400, "Current password is incorrect")

    // 2. Verify OTP
    const record = await Otp.findOne({ email: user.email, type: 'change_password' })
    if (!record) throw new ApiError(400, "OTP has expired or is invalid. Please request a new one.")

    const isValidOtp = await record.verifyOtp(otp)
    if (!isValidOtp) throw new ApiError(400, "Incorrect OTP. Please try again.")

    // 3. Delete OTP so it can't be reused
    await record.deleteOne()

    // 4. Set new password (pre-save hook hashes it)
    user.password = newPassword
    await user.save()

    return res.status(200).json(
        new ApiResponse(200, {}, "Password changed successfully")
    )
})