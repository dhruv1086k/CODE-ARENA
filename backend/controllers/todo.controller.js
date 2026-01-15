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

export const getTodos = asyncHandlerWrapper(async (req, res) => {
    const userId = req.user._id.toString()
    const todos = await Todo.find({ owner: userId })

    if (!todos) {
        throw new ApiError(401, "Todos not found")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, todos, "Todos Received")
        )
})

export const getUserTodo = asyncHandlerWrapper(async (req, res) => {
    const todoId = req.params.id
    const userId = req.user._id

    const todo = await Todo.findOne(
        { _id: todoId, owner: userId },
    )
    if (!todo) {
        throw new ApiError(403, "Todo not found or you are not authorized")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, todo, "Todo fetched successfully")
        )
})

export const updateTodo = asyncHandlerWrapper(async (req, res) => {
    const todoId = req.params.id.toString()
    const userId = req.user._id

    const updatedTodo = await Todo.findOneAndUpdate(
        { _id: todoId, owner: userId },
        { $set: { isCompleted: true } },
        { new: true }
    )

    if (!updatedTodo) {
        throw new ApiError(401, "Todo not found or user not authorized")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(200, updatedTodo, "Task Completed Successfully")
        )
})