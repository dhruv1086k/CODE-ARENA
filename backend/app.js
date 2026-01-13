import express from 'express'
import Router from './routes/auth.route.js'
import cookieParser from 'cookie-parser'

const app = express()

app.use(express.static('public'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// ============= Routes =============
app.get("/health", (req, res) => {
    res.send("Health OK")
})

app.use("/api/v1/auth", Router)


export default app