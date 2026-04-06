import swaggerJsdoc from 'swagger-jsdoc'

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'CodeArena API',
            version: '1.0.0',
            description:
                'REST API for CodeArena — a developer productivity platform to track coding study sessions, manage tasks, and visualize progress through streaks and heatmaps.',
            contact: {
                name: 'Dhruv Pal',
            },
        },
        servers: [
            {
                url: 'http://localhost:5000',
                description: 'Local Development Server',
            },
        ],
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter your access token (obtained from /api/v1/auth/login)',
                },
            },
            schemas: {
                // ── Auth ────────────────────────────────────────────────────
                RegisterRequest: {
                    type: 'object',
                    required: ['name', 'username', 'email', 'password'],
                    properties: {
                        name: { type: 'string', example: 'Dhruv Pal' },
                        username: { type: 'string', example: 'dhruvpal' },
                        email: { type: 'string', format: 'email', example: 'dhruv@codearena.io' },
                        password: { type: 'string', minLength: 6, example: 'Secret123!' },
                    },
                },
                LoginRequest: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: { type: 'string', format: 'email', example: 'dhruv@codearena.io' },
                        password: { type: 'string', example: 'Secret123!' },
                    },
                },
                AuthResponse: {
                    type: 'object',
                    properties: {
                        statusCode: { type: 'integer', example: 200 },
                        success: { type: 'boolean', example: true },
                        message: { type: 'string', example: 'User logged in successfully' },
                        data: {
                            type: 'object',
                            properties: {
                                user: { $ref: '#/components/schemas/User' },
                                accessToken: { type: 'string' },
                                refreshToken: { type: 'string' },
                            },
                        },
                    },
                },
                // ── User ────────────────────────────────────────────────────
                User: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string', example: '6614b2e9f1a2b3c4d5e6f7a8' },
                        name: { type: 'string', example: 'Dhruv Pal' },
                        username: { type: 'string', example: 'dhruvpal' },
                        email: { type: 'string', format: 'email', example: 'dhruv@codearena.io' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                // ── Todo ────────────────────────────────────────────────────
                Todo: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        topicTag: { type: 'string', example: 'Refactor Auth Module' },
                        description: { type: 'string', example: 'Clean up the JWT helper functions' },
                        isCompleted: { type: 'boolean', example: false },
                        completedAt: { type: 'string', format: 'date-time', nullable: true },
                        owner: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                CreateTodoRequest: {
                    type: 'object',
                    required: ['topicTag'],
                    properties: {
                        topicTag: { type: 'string', example: 'Refactor Auth Module' },
                        description: { type: 'string', example: 'Clean up the JWT helper functions' },
                    },
                },
                // ── Study Session ───────────────────────────────────────────
                StudySession: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string' },
                        startTime: { type: 'string', format: 'date-time' },
                        endTime: { type: 'string', format: 'date-time' },
                        duration: { type: 'integer', description: 'Duration in seconds', example: 3600 },
                        topicTag: { type: 'string', example: 'React Hooks', nullable: true },
                        sessionDate: { type: 'string', format: 'date-time' },
                        owner: { type: 'string' },
                    },
                },
                SessionStats: {
                    type: 'object',
                    properties: {
                        totalStudyTime: { type: 'integer', description: 'Total study time in seconds', example: 7200 },
                        totalSessions: { type: 'integer', example: 4 },
                    },
                },
                StreakData: {
                    type: 'object',
                    properties: {
                        currentStreak: { type: 'integer', example: 5 },
                        longestStreak: { type: 'integer', example: 14 },
                        lastActiveDate: { type: 'string', format: 'date-time', nullable: true },
                    },
                },
                HeatmapEntry: {
                    type: 'object',
                    properties: {
                        day: { type: 'string', format: 'date-time', example: '2026-04-01T00:00:00.000Z' },
                        count: { type: 'integer', example: 3 },
                    },
                },
                // ── Generic ─────────────────────────────────────────────────
                ApiResponse: {
                    type: 'object',
                    properties: {
                        statusCode: { type: 'integer' },
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        data: { type: 'object' },
                    },
                },
                ApiError: {
                    type: 'object',
                    properties: {
                        statusCode: { type: 'integer' },
                        success: { type: 'boolean', example: false },
                        message: { type: 'string' },
                        errors: { type: 'array', items: { type: 'object' } },
                    },
                },
                Pagination: {
                    type: 'object',
                    properties: {
                        page: { type: 'integer', example: 1 },
                        limit: { type: 'integer', example: 10 },
                        totalPages: { type: 'integer', example: 5 },
                    },
                },
            },
        },
        security: [{ BearerAuth: [] }],
    },
    apis: ['./routes/*.js'],    // JSDoc comments live in the route files
}

export const swaggerSpec = swaggerJsdoc(options)
