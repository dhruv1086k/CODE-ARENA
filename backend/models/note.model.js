import mongoose from 'mongoose';

export const NOTE_TAGS = ['DSA', 'Backend', 'Bugs', 'Ideas', 'Interview Prep'];

const noteSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    kind: {
      type: String,
      enum: ['workspace'],
      default: 'workspace',
    },
    title: {
      type: String,
      default: 'Workspace',
      trim: true,
      maxlength: 120,
    },
    content: {
      type: String,
      default: '',
      maxlength: 12000,
    },
    tags: {
      type: [String],
      enum: NOTE_TAGS,
      default: [],
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    sessionContext: {
      topicTag: { type: String, trim: true, maxlength: 100, default: null },
      capturedAt: { type: Date, default: null },
    },
    lastEditedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true },
);

noteSchema.index({ owner: 1, kind: 1 }, { unique: true });

export const Note = mongoose.model('Note', noteSchema);
