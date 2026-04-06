import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import helmet from 'helmet'
import swaggerUi from 'swagger-ui-express'

import { swaggerSpec } from './config/swagger.js'
import authRouter from './routes/auth.route.js'
import UserRouter from './routes/user.route.js'
import TodoRouter from './routes/todo.route.js'
import studySessionRouter from './routes/study-session.route.js'

const app = express()

// ── Security headers (Bug Fix #5 — helmet) ───────────────────────────────────
app.use(helmet({
    // Allow Swagger UI's inline scripts & styles
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https:"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}))

// ── CORS ─────────────────────────────────────────────────────────────────────
// FRONTEND_URLS = comma-separated list of allowed origins
// e.g. "http://localhost:5173,https://code-arena-dp.vercel.app"
const allowedOrigins = (process.env.FRONTEND_URLS || 'http://localhost:5173')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean)

// In development, also allow the backend's own origin (for Swagger UI "Try it out")
if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.push(`http://localhost:${process.env.PORT || 5000}`)
}

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (Postman, curl, server-to-server)
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
        callback(new Error(`CORS: origin ${origin} not allowed`))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}))

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }))          // cap body size
app.use(express.urlencoded({ extended: true, limit: '10kb' }))
app.use(cookieParser())
app.use(express.static('public'))

// ── Swagger UI — served at /api-docs ─────────────────────────────────────────
app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
        customSiteTitle: 'CodeArena API Docs',
        swaggerOptions: {
            persistAuthorization: true,     // keeps Bearer token between page refreshes
            docExpansion: 'none',           // collapse all sections by default
            filter: true,                   // enable endpoint search bar
        },
    })
)

// ── Swagger spec as raw JSON (useful for importing into Postman/Insomnia) ────
app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.send(swaggerSpec)
})

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRouter)
app.use('/api/v1/users', UserRouter)
app.use('/api/v1/todos', TodoRouter)
app.use('/api/v1/study-session', studySessionRouter)

// ── Global error handler ──────────────────────────────────────────────────────
// Centralises error responses so no controller needs to handle res.json() on errors
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500
    const message = err.message || 'Internal Server Error'
    res.status(statusCode).json({
        success: false,
        statusCode,
        message,
        errors: err.errors || [],
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    })
})

export default app