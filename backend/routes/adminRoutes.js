import express from 'express';
import { addOrganizer, getAllOrganizers, removeOrganizer, getPasswordResetRequests, handlePasswordReset, requestPasswordReset } from '../controllers/adminController.js';
import { protect, adminOnly, organizerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// Admin routes
router.post('/organizers', protect, adminOnly, addOrganizer);
router.get('/organizers', protect, adminOnly, getAllOrganizers);
router.delete('/organizers/:id', protect, adminOnly, removeOrganizer);
router.get('/password-resets', protect, adminOnly, getPasswordResetRequests);
router.put('/password-resets/:id', protect, adminOnly, handlePasswordReset);

// Organizer route (request password reset)
router.post('/request-password-reset', protect, requestPasswordReset);

export default router;