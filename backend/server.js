import dotenv from 'dotenv';
import { connnectDB } from './config/db.js';
import app from './app.js';

dotenv.config({
    path: './env'
})

const PORT = process.env.PORT || 8000

connnectDB().
    then(() => {
        console.log("DB connected Successfully");
        app.listen(PORT, () => {
            console.log("Server is running on port ", PORT)
        })
    })
    .catch((err) => {
        console.log(err.message);
    })