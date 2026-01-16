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
        .status(201)
        .json(
            new ApiResponse(201, todo, "Todo Created")
        )
})

export const getTodos = asyncHandlerWrapper(async (req, res) => {
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 10
    const offset = (page - 1) * limit
    const userId = req.user._id
    const completed = req.query.completed
    const filter = { owner: userId }

    if (completed === 'true') {
        filter.isCompleted = true
    }
    if (completed === 'false') {
        filter.isCompleted = false
    }

    const todo = await Todo.find(filter)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)

    const totalDocuments = await Todo.countDocuments(filter)
    const totalPages = Math.ceil(totalDocuments / limit)

    return res
        .status(200)
        .json(
            new ApiResponse(200, {
                todo,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "totalTodos": totalDocuments,
                    "totalPages": totalPages
                }
            }, "Todos fetched successfully")
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

export const toggleTodo = asyncHandlerWrapper(async (req, res) => {
    const todoId = req.params.id
    const userId = req.user._id

    const todo = await Todo.findOne(
        { _id: todoId, owner: userId }
    )

    if (!todo) {
        throw new ApiError(401, "Todo not found or you are not authorized")
    }

    todo.isCompleted = !todo.isCompleted
    await todo.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(
            new ApiResponse(200, todo, "Task status changed Successfully")
        )
})

export const deleteTodo = asyncHandlerWrapper(async (req, res) => {
    const todoId = req.params.id
    const userId = req.user.id

    const deletedTodo = await Todo.findOneAndDelete(
        { _id: todoId, owner: userId },
    )

    if (!deletedTodo) {
        throw new ApiError(401, "Todo not found or you are not authorized to deleted this todo")
    }

    return res.status(200)
        .json(
            new ApiResponse(200, deletedTodo, "Todo deleted successfully")
        )
})
