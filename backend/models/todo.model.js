import mongoose from "mongoose";

const todoSchema = new mongoose.Schema({
    topicTag: {
        type: String,
        required: true
    },
    isCompleted: {
        type: Boolean,
        default: false
    },
    description: {
        type: String,
    },
    completedAt: {
        type: Date
    },
    owner: {
        type: mongoose.Types.ObjectId,
        ref: "User"
    }
}, {
    timestamps: true
})

export const Todo = mongoose.model("Todo", todoSchema)