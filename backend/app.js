import express from 'express'
import Router from './routes/auth.route.js'

const app = express()

app.use(express.static('public'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ============= Routes =============
app.get("/health", (req, res) => {
    res.send("Health OK")
})

app.use("/api/v1/auth", Router)


export default app