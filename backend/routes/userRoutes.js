import express from 'express';
import { getProfile, updateProfile, changePassword, getOrganizers, getOrganizerById, toggleFollowOrganizer } from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public
router.get('/organizers', getOrganizers);
router.get('/organizers/:id', getOrganizerById);

// Protected
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.put('/organizers/:organizerId/follow', protect, toggleFollowOrganizer);

export default router;
