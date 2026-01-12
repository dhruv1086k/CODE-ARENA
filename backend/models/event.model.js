import mongoose from "mongoose";

const eventSchema = new mongoose.Schema({
    eventName: {
        type: String,
        required: true,
    },
    eventDate: {
        type: Date,
        required: true
    },
    description: {
        type: String,
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
}, {
    timestamps: true
})

export const Event = mongoose.model("event", eventSchema)