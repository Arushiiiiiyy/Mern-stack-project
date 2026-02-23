import express from 'express';
import { createEvent, getEvents, getMyEvents, getEventById, updateEvent, getEventRegistrations, exportRegistrations, getRecommendedEvents, getOrganizerAnalytics } from '../controllers/eventController.js';
import { protect, organizerOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public Route: Anyone can see events
router.get('/', getEvents);

// Recommended events for logged-in user
router.get('/recommended', protect, getRecommendedEvents);

// Protected Routes: Only Organizers can do this
router.get('/my-events', protect, organizerOnly, getMyEvents);
router.get('/analytics', protect, organizerOnly, getOrganizerAnalytics);
router.post('/', protect, organizerOnly, createEvent);

// Single event (public) - MUST be after /my-events
router.get('/:id', getEventById);

// Event management (organizer)
router.put('/:id', protect, organizerOnly, updateEvent);
router.get('/:id/registrations', protect, organizerOnly, getEventRegistrations);
router.get('/:id/registrations/export', protect, organizerOnly, exportRegistrations);

export default router;