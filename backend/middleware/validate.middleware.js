import { z } from 'zod'
import { ApiError } from '../utils/ApiError.js'

// ── Auth Schemas ─────────────────────────────────────────────────────────────

export const registerSchema = z.object({
    name: z
        .string({ required_error: 'Name is required' })
        .min(2, 'Name must be at least 2 characters')
        .max(60, 'Name must be at most 60 characters')
        .trim(),
    username: z
        .string({ required_error: 'Username is required' })
        .min(3, 'Username must be at least 3 characters')
        .max(30, 'Username must be at most 30 characters')
        .regex(/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and underscores')
        .trim(),
    email: z
        .string({ required_error: 'Email is required' })
        .email('Invalid email address')
        .toLowerCase()
        .trim(),
    password: z
        .string({ required_error: 'Password is required' })
        .min(6, 'Password must be at least 6 characters')
        .max(72, 'Password must be at most 72 characters'),
})

export const loginSchema = z.object({
    email: z
        .string({ required_error: 'Email is required' })
        .email('Invalid email address')
        .toLowerCase()
        .trim(),
    password: z
        .string({ required_error: 'Password is required' })
        .min(1, 'Password is required'),
})

export const changePasswordSchema = z.object({
    currentPassword: z
        .string({ required_error: 'Current password is required' })
        .min(1, 'Current password is required'),
    newPassword: z
        .string({ required_error: 'New password is required' })
        .min(6, 'New password must be at least 6 characters')
        .max(72, 'New password must be at most 72 characters'),
})

// ── Todo Schemas ─────────────────────────────────────────────────────────────

export const createTodoSchema = z.object({
    topicTag: z
        .string({ required_error: 'Task title is required' })
        .min(1, 'Task title cannot be empty')
        .max(200, 'Task title must be at most 200 characters')
        .trim(),
    description: z
        .string()
        .max(1000, 'Description must be at most 1000 characters')
        .trim()
        .optional(),
})

// ── Study Session Schemas ────────────────────────────────────────────────────

export const startSessionSchema = z.object({
    topicTag: z
        .string()
        .max(100, 'Topic tag must be at most 100 characters')
        .trim()
        .optional()
        .nullable(),
})

// ── Middleware Factory ───────────────────────────────────────────────────────

/**
 * Validates req.body against a Zod schema.
 * On failure, throws ApiError(400) with the first validation message.
 */
export function validate(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.body)
        if (!result.success) {
            const message = result.error.errors[0]?.message || 'Validation failed'
            return next(new ApiError(400, message, result.error.errors))
        }
        // Replace req.body with the sanitized + coerced data
        req.body = result.data
        next()
    }
}
