import express from 'express';
import { createTeam, joinTeam, getMyTeams, getTeamById, getEventTeams, leaveTeam, cancelTeam } from '../controllers/teamController.js';
import { protect, organizerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, createTeam);
router.post('/join', protect, joinTeam);
router.get('/my-teams', protect, getMyTeams);
router.get('/event/:eventId', protect, organizerOnly, getEventTeams);
router.get('/:id', protect, getTeamById);
router.put('/:id/leave', protect, leaveTeam);
router.delete('/:id', protect, cancelTeam);

export default router;
