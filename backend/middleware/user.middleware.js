import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandlerWrapper } from "../utils/Async-handler.js";

export const getUserData = asyncHandlerWrapper(async (req, res) => {
    const userData = req.user
    
    if (!userData) {
        throw new ApiError(401, "User data not found")
    }

    return res.status(200).json(
        new ApiResponse(200, userData, "User Data Sent Successfully")
    )
})