import express from "express"
import { verifyJWT } from "../middleware/auth.middleware.js"
import { createTodos } from "../controllers/todo.controller.js"

const TodoRouter = express.Router()

TodoRouter.route("/").post(verifyJWT, createTodos)

export default TodoRouter