import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'

const otpSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
    },
    otp: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ['forgot_password', 'change_password'],
        required: true,
    },
    // TTL index: MongoDB automatically deletes doc after 10 minutes
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 10 * 60 * 1000),
        index: { expires: 0 },
    },
}, {
    timestamps: true,
})

// Hash OTP before saving
otpSchema.pre('save', async function () {
    if (!this.isModified('otp')) return
    this.otp = await bcrypt.hash(this.otp, 8)
})

// Verify a plain-text OTP against the stored hash
otpSchema.methods.verifyOtp = async function (plainOtp) {
    return bcrypt.compare(plainOtp, this.otp)
}

export const Otp = mongoose.model('Otp', otpSchema)
