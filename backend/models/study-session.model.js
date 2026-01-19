import mongoose from "mongoose";

const studySessionSchema = new mongoose.Schema({
    startTime: {
        type: Date,
        required: true
    },
    endTime: {
        type: Date,
        required: true
    },
    duration: {
        type: Number,
        default: 0,
        required: true
    },
    topicTag: {
        type: String,
    },
    sessionDate: {
        type: Date,
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
}, {
    timestamps: true
})

export const Session = mongoose.model("StudySession", studySessionSchema)