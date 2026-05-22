import express from 'express';
import { getWorkspaceNote, upsertWorkspaceNote } from '../controllers/note.controller.js';
import { verifyJWT } from '../middleware/auth.middleware.js';
import { validate, updateWorkspaceNoteSchema } from '../middleware/validate.middleware.js';

const noteRouter = express.Router();

/**
 * @swagger
 * tags:
 *   name: Notes
 *   description: Dashboard workspace notes (persistent, per-user)
 */

/**
 * @swagger
 * /api/v1/notes/workspace:
 *   get:
 *     summary: Get the user's dashboard workspace note (creates empty if missing)
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Workspace note
 *       401:
 *         description: Unauthorised
 */
noteRouter.get('/workspace', verifyJWT, getWorkspaceNote);

/**
 * @swagger
 * /api/v1/notes/workspace:
 *   put:
 *     summary: Upsert workspace note (autosave)
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Saved workspace note
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorised
 */
noteRouter.put('/workspace', verifyJWT, validate(updateWorkspaceNoteSchema), upsertWorkspaceNote);

export default noteRouter;
