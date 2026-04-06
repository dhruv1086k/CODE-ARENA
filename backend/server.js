import dotenv from 'dotenv'
import { connnectDB } from './config/db.js'
import { connectRedis } from './config/redis.js'
import app from './app.js'

dotenv.config({ path: './.env' })

const PORT = process.env.PORT || 5000

connnectDB()
    .then(async () => {
        console.log('[MongoDB] Connected successfully')

        // Redis is optional — app works without it (graceful fallback)
        await connectRedis()

        app.listen(PORT, () => {
            console.log(`[Server] Running on http://localhost:${PORT}`)
            console.log(`[Swagger] API docs at http://localhost:${PORT}/api-docs`)
        })
    })
    .catch((err) => {
        console.error('[Fatal] DB connection failed:', err.message)
        process.exit(1)
    })