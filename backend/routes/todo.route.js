import express from "express"
import { createTodo, deleteTodo, getTodos, getUserTodo, updateTodo } from "../controllers/todo.controller.js"
import { verifyJWT } from "../middleware/auth.middleware.js"

const TodoRouter = express.Router()

TodoRouter.route("/").post(verifyJWT, createTodo)
TodoRouter.route("/").get(verifyJWT, getTodos)
TodoRouter.route("/:id").get(verifyJWT, getUserTodo)
TodoRouter.route("/:id/update").get(verifyJWT, updateTodo)
TodoRouter.route("/:id/delete").get(verifyJWT, deleteTodo)

export default TodoRouter