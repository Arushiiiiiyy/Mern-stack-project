import express from 'express';
import { getEventICS, getBatchICS, getGoogleCalendarLink } from '../controllers/calendarController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/batch', protect, getBatchICS);
router.get('/:eventId', getEventICS);
router.get('/:eventId/google', getGoogleCalendarLink);

export default router;
