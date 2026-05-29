import { Note } from '../models/note.model.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandlerWrapper } from '../utils/Async-handler.js';

const workspaceFilter = (userId) => ({ owner: userId, kind: 'workspace' });

export const getWorkspaceNote = asyncHandlerWrapper(async (req, res) => {
  const userId = req.user._id;

  let note = await Note.findOne(workspaceFilter(userId));

  if (!note) {
    note = await Note.create({
      owner: userId,
      kind: 'workspace',
      title: 'Workspace',
      content: '',
      tags: [],
    });
  }

  return res.status(200).json(
    new ApiResponse(200, note, 'Workspace note fetched successfully'),
  );
});

export const upsertWorkspaceNote = asyncHandlerWrapper(async (req, res) => {
  const userId = req.user._id;
  const { content, title, tags, isPinned, sessionTopicTag } = req.body;

  const update = { lastEditedAt: new Date() };

  if (content !== undefined) update.content = content;
  if (title !== undefined) update.title = title;
  if (tags !== undefined) update.tags = tags;
  if (isPinned !== undefined) update.isPinned = isPinned;

  if (sessionTopicTag !== undefined) {
    update.sessionContext = sessionTopicTag
      ? { topicTag: sessionTopicTag, capturedAt: new Date() }
      : { topicTag: null, capturedAt: null };
  }

  const note = await Note.findOneAndUpdate(
    workspaceFilter(userId),
    {
      $set: update,
      $setOnInsert: {
        owner: userId,
        kind: 'workspace',
      },
    },
    { upsert: true, new: true, runValidators: true },
  );

  return res.status(200).json(
    new ApiResponse(200, note, 'Workspace note saved successfully'),
  );
});
