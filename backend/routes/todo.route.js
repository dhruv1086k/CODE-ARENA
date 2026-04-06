import express from "express"
import { createTodo, deleteTodo, getTodos, getUserTodo, toggleTodo } from "../controllers/todo.controller.js"
import { verifyJWT } from "../middleware/auth.middleware.js"
import { validate, createTodoSchema } from "../middleware/validate.middleware.js"

const TodoRouter = express.Router()

/**
 * @swagger
 * tags:
 *   name: Todos
 *   description: Task / workspace management
 */

/**
 * @swagger
 * /api/v1/todos:
 *   post:
 *     summary: Create a new todo task
 *     tags: [Todos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateTodoRequest'
 *     responses:
 *       201:
 *         description: Todo created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Todo'
 *       400:
 *         description: Validation error — topicTag is required
 *       401:
 *         description: Unauthorised
 */
TodoRouter.post('/', verifyJWT, validate(createTodoSchema), createTodo)

/**
 * @swagger
 * /api/v1/todos:
 *   get:
 *     summary: Get all todos for the current user (paginated)
 *     tags: [Todos]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page (max 100)
 *       - in: query
 *         name: completed
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filter by completion status
 *       - in: query
 *         name: s
 *         schema:
 *           type: string
 *         description: Search keyword (matches title and description)
 *     responses:
 *       200:
 *         description: Paginated list of todos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     todos:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Todo'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorised
 */
TodoRouter.get('/', verifyJWT, getTodos)

/**
 * @swagger
 * /api/v1/todos/{id}:
 *   get:
 *     summary: Get a single todo by ID
 *     tags: [Todos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Todo document _id
 *     responses:
 *       200:
 *         description: Todo returned
 *       404:
 *         description: Todo not found or not owned by this user
 *       401:
 *         description: Unauthorised
 */
TodoRouter.get('/:id', verifyJWT, getUserTodo)

/**
 * @swagger
 * /api/v1/todos/{id}/toggle:
 *   patch:
 *     summary: Toggle a todo's completion status
 *     tags: [Todos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Status toggled — returns updated todo
 *       404:
 *         description: Todo not found
 *       401:
 *         description: Unauthorised
 */
TodoRouter.patch('/:id/toggle', verifyJWT, toggleTodo)

/**
 * @swagger
 * /api/v1/todos/{id}/delete:
 *   delete:
 *     summary: Delete a todo
 *     tags: [Todos]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Todo deleted successfully
 *       404:
 *         description: Todo not found
 *       401:
 *         description: Unauthorised
 */
TodoRouter.delete('/:id/delete', verifyJWT, deleteTodo)

export default TodoRouter