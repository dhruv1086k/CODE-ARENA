import express from 'express'
import cookieParser from 'cookie-parser'
import authRouter from './routes/auth.route.js'
import UserRouter from './routes/user.route.js'

const app = express()

app.use(express.static('public'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// ============= Routes =============
app.get("/health", (req, res) => {
    res.send("Health OK")
})

app.use("/api/v1/auth", authRouter)
app.use("/api/v1/users", UserRouter)


export default app