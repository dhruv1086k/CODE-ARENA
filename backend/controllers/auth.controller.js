import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandlerWrapper } from "../utils/Async-handler.js";
import jwt from 'jsonwebtoken'

const generateAccessAndRefreshToken = async (userId) => {
    try {
        const user = await User.findOne(userId)
        const accessToken = await user.generateAccessToken()
        const refreshToken = await user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }
    } catch (error) {
        res.status(500).json({
            message: "Something went wrong"
        })
    }
}

export const registerUser = asyncHandlerWrapper(async (req, res) => {
    const { name, username, email, password } = req.body

    if (!name || !username || !email || !password) {
        throw new ApiError(400, "User Details Required")
    }

    const existingUser = await User.findOne({ email })
    if (existingUser) {
        throw new ApiError(401, "User Already Exists")
    }

    const user = await User.create({
        name,
        email,
        username,
        password,
    })

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

    const createdUser = await User.findById(user._id).select("-password -refreshToken")


    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering user")
    }

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .cookie("refreshToken", refreshToken, options)
        .status(201)
        .json(
            new ApiResponse(201, {
                user: createdUser,
                accessToken,
                refreshToken
            }, "User Created Successfully"),
        )
})

export const loginUser = asyncHandlerWrapper(async (req, res) => {
    const { email, password } = req.body

    if (!email || !password) {
        throw new ApiError(400, "User details required")
    }

    const isUser = await User.findOne({ email })

    if (!isUser) {
        throw new ApiError(401, "User not found")
    }

    const userPassword = await isUser.isPasswordCorrect(password)
    if (!userPassword) {
        throw new ApiError(401, "Incorrect password")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(isUser._id)

    const loggedUser = await User.findById(isUser._id).select("-password -refreshToken")

    if (!loggedUser) {
        throw new ApiError(500, "Something went wrong while logging user")
    }

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200, {
                user: loggedUser,
                accessToken,
                refreshToken
            }, "User Loggedin Successfully")
        )
})

export const logoutUser = asyncHandlerWrapper(async (req, res) => {
    const userId = req.user._id?.toString()

    const user = await User.findById(userId)

    if (!user) {
        throw new ApiError(401, "User not found")
    }

    user.refreshToken = ""
    await user.save({ validateBeforeSave: false })

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(200, "", "User LoggedOut Successfully")
        )
})

export const refreshToken = asyncHandlerWrapper(async (req, res) => {
    const token = req.cookies?.refreshToken

    if (!token) {
        throw new ApiError(401, "Token not found")
    }

    const decodedToken = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET_KEY)
    const user = await User.findById(decodedToken._id).select("-password")

    if (!user) {
        throw new ApiError(401, "User not found")
    }

    if (token !== user.refreshToken) {
        throw new ApiError(401, "Refresh Token is wrong")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200, accessToken, "Successfully refreshed access token")
        )
}) 