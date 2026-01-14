import { Todo } from "../models/todo.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandlerWrapper } from "../utils/Async-handler.js";

export const createTodos = asyncHandlerWrapper(async (req, res) => {
    const { topicTag, description } = req.body
    const userID = req.user._id

    if (!topicTag) {
        throw new ApiError(400, "Todo Topic is required")
    }

    const todo = await Todo.create({
        topicTag,
        description,
        owner: userID
    })

    return res.status(201).json(
        new ApiResponse(201, todo, "Todo created successfully")
    )
}) 