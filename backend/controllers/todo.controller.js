import { Todo } from "../models/todo.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandlerWrapper } from "../utils/Async-handler.js";

export const createTodo = asyncHandlerWrapper(async (req, res) => {
    // Body already validated by Zod middleware (topicTag is required + trimmed)
    const { topicTag, description } = req.body
    const userId = req.user._id

    const todo = await Todo.create({
        topicTag,
        description: description || undefined,
        owner: userId
    })

    return res
        .status(201)
        .json(new ApiResponse(201, todo, "Todo created successfully"))
})

export const getTodos = asyncHandlerWrapper(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10))
    const offset = (page - 1) * limit
    const userId = req.user._id
    const completed = req.query.completed

    // BUG FIX #2: safely read optional search string (was crashing on .trim() of undefined)
    const searchKey = (req.query.s || '').trim()

    const filter = { owner: userId }

    if (completed === 'true') filter.isCompleted = true
    if (completed === 'false') filter.isCompleted = false

    if (searchKey) {
        filter.$or = [
            { topicTag: { $regex: searchKey, $options: 'i' } },
            { description: { $regex: searchKey, $options: 'i' } },
        ]
    }

    const [todos, totalDocuments] = await Promise.all([
        Todo.find(filter).sort({ createdAt: -1 }).skip(offset).limit(limit),
        Todo.countDocuments(filter),
    ])

    const totalPages = Math.ceil(totalDocuments / limit)

    return res.status(200).json(
        new ApiResponse(200, {
            todos,
            pagination: { page, limit, totalTodos: totalDocuments, totalPages },
        }, "Todos fetched successfully")
    )
})

export const getUserTodo = asyncHandlerWrapper(async (req, res) => {
    const { id: todoId } = req.params
    const userId = req.user._id

    const todo = await Todo.findOne({ _id: todoId, owner: userId })
    if (!todo) throw new ApiError(404, "Todo not found or you are not authorised")

    return res.status(200).json(new ApiResponse(200, todo, "Todo fetched successfully"))
})

export const toggleTodo = asyncHandlerWrapper(async (req, res) => {
    const { id: todoId } = req.params
    const userId = req.user._id

    const todo = await Todo.findOne({ _id: todoId, owner: userId })
    if (!todo) throw new ApiError(404, "Todo not found or you are not authorised")

    todo.isCompleted = !todo.isCompleted
    todo.completedAt = todo.isCompleted ? new Date() : undefined
    await todo.save({ validateBeforeSave: false })

    return res.status(200).json(new ApiResponse(200, todo, "Task status updated successfully"))
})

export const deleteTodo = asyncHandlerWrapper(async (req, res) => {
    const { id: todoId } = req.params
    const userId = req.user._id

    const deleted = await Todo.findOneAndDelete({ _id: todoId, owner: userId })
    if (!deleted) throw new ApiError(404, "Todo not found or you are not authorised")

    return res.status(200).json(new ApiResponse(200, deleted, "Todo deleted successfully"))
})
