import express from 'express'

const app = express()

app.use(express.static('public'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// ============= Routes =============
app.get("/health", (req, res) => {
    res.send("Health OK")
})


export default app