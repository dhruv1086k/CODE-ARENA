import express from "express"
import { createTodo, deleteTodo, getTodos, getUserTodo, toggleTodo } from "../controllers/todo.controller.js"
import { verifyJWT } from "../middleware/auth.middleware.js"

const TodoRouter = express.Router()

TodoRouter.route("/").post(verifyJWT, createTodo)
TodoRouter.route("/").get(verifyJWT, getTodos)
TodoRouter.route("/:id").get(verifyJWT, getUserTodo)
TodoRouter.route("/:id/toggle").patch(verifyJWT, toggleTodo)
TodoRouter.route("/:id/delete").delete(verifyJWT, deleteTodo)

export default TodoRouter