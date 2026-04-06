import express from "express"
import {
    getHeatMap,
    getStats,
    getStreak,
    getStudySession,
    studySessionStart,
    studySessionStop
} from "../controllers/study-session.controller.js"
import { verifyJWT } from "../middleware/auth.middleware.js"
import { validate, startSessionSchema } from "../middleware/validate.middleware.js"

const studySessionRouter = express.Router()

/**
 * @swagger
 * tags:
 *   name: Study Sessions
 *   description: Track and analyse coding study sessions
 */

/**
 * @swagger
 * /api/v1/study-session:
 *   get:
 *     summary: Get paginated study session history
 *     tags: [Study Sessions]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: sessionDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter sessions by date (YYYY-MM-DD)
 *       - in: query
 *         name: topic
 *         schema:
 *           type: string
 *         description: Filter by topic tag (partial match, case-insensitive)
 *     responses:
 *       200:
 *         description: Paginated sessions list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     Sessions:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/StudySession'
 *                     Pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorised
 */
studySessionRouter.get('/', verifyJWT, getStudySession)

/**
 * @swagger
 * /api/v1/study-session/start:
 *   post:
 *     summary: Start a new study session
 *     tags: [Study Sessions]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               topicTag:
 *                 type: string
 *                 example: React Hooks
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Session started — returns the active session info
 *       409:
 *         description: A session is already running
 *       401:
 *         description: Unauthorised
 */
studySessionRouter.post('/start', verifyJWT, validate(startSessionSchema), studySessionStart)

/**
 * @swagger
 * /api/v1/study-session/stop:
 *   post:
 *     summary: Stop the current active study session and persist it
 *     tags: [Study Sessions]
 *     responses:
 *       200:
 *         description: Session stopped — returns the saved session document
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/StudySession'
 *       400:
 *         description: No active session to stop
 *       401:
 *         description: Unauthorised
 */
studySessionRouter.post('/stop', verifyJWT, studySessionStop)

/**
 * @swagger
 * /api/v1/study-session/stats:
 *   get:
 *     summary: Get today's total study time and session count (Redis cached – 60s TTL)
 *     tags: [Study Sessions]
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Date to query – defaults to today (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Stats returned (may be served from Redis cache)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/SessionStats'
 *       401:
 *         description: Unauthorised
 */
studySessionRouter.get('/stats', verifyJWT, getStats)

/**
 * @swagger
 * /api/v1/study-session/streak:
 *   get:
 *     summary: Get current and longest coding streak (Redis cached – 5 min TTL)
 *     tags: [Study Sessions]
 *     responses:
 *       200:
 *         description: Streak data (may be served from Redis cache)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/StreakData'
 *       401:
 *         description: Unauthorised
 */
studySessionRouter.get('/streak', verifyJWT, getStreak)

/**
 * @swagger
 * /api/v1/study-session/heatmap:
 *   get:
 *     summary: Get session activity heatmap data for the last 90 days (Redis cached – 10 min TTL)
 *     tags: [Study Sessions]
 *     responses:
 *       200:
 *         description: Array of day/count pairs for the heatmap (may be served from Redis cache)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/HeatmapEntry'
 *       401:
 *         description: Unauthorised
 */
studySessionRouter.get('/heatmap', verifyJWT, getHeatMap)

export default studySessionRouter