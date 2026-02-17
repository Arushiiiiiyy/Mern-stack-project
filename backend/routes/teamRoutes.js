import express from 'express';
import { createTeam, joinTeam, getMyTeams, getTeamById } from '../controllers/teamController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/', protect, createTeam);
router.post('/join', protect, joinTeam);
router.get('/my-teams', protect, getMyTeams);
router.get('/:id', protect, getTeamById);

export default router;
