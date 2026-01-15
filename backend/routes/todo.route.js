import express from "express"
import { createTodo } from "../controllers/todo.controller.js"
import { verifyJWT } from "../middleware/auth.middleware.js"

const TodoRouter = express.Router()

TodoRouter.route("/").post(verifyJWT, createTodo)

export default TodoRouter