import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandlerWrapper } from "../utils/Async-handler.js";
import jwt from "jsonwebtoken"

export const verifyJWT = asyncHandlerWrapper(async (req, res, next) => {
    const token = req.header("Authorization")?.split(" ")[1]

    if (!token) {
        throw new ApiError(401, "Token not found")
    }

    const decodeToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET_KEY)

    const user = await User.findById(decodeToken._id).select("-password -refreshToken")
    if (!user) {
        throw new ApiError(401, "User not found")
    }

    req.user = user

    next()
})