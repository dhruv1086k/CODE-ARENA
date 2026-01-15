import { Todo } from "../models/todo.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandlerWrapper } from "../utils/Async-handler.js";

export const createTodo = asyncHandlerWrapper(async (req, res) => {
    const { topicTag, description } = req.body
    const user = req.user._id

    if (!topicTag) {
        throw new ApiError(401, "Todo name is required")
    }

    const todo = await Todo.create({
        topicTag,
        description,
        owner: user
    })

    return res
        .status(200)
        .json(
            new ApiResponse(200, todo, "Todo Created")
        )
})