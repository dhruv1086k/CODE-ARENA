import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandlerWrapper } from "../utils/Async-handler.js";

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
        password
    })

    const createdUser = await User.findById(user._id).select("-password")

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering user")
    }

    return res.status(201).json(
        new ApiResponse(201, createdUser, "User Created Successfully")
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

    const loggedUser = await User.findById(isUser._id).select("-password")

    if (!loggedUser) {
        throw new ApiError(500, "Something went wrong while logging user")
    }

    return res.status(200).json(
        new ApiResponse(200, loggedUser, "User Loggedin Successfully")
    )
})