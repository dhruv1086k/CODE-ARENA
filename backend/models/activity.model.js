import mongoose from "mongoose";

const activitySchema = new mongoose.Schema({
    date: {
        type: Date,
    },
    activityCount: {
        type: Number,
        default: 0
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
}, {
    timestamps: true
})

export const Activity = mongoose.model("activity", activitySchema)