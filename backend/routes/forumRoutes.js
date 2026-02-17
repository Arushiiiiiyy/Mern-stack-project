import express from 'express';
import { getMessages, postMessage, togglePinMessage, deleteMessage, reactToMessage } from '../controllers/forumController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/:eventId', protect, getMessages);
router.post('/:eventId', protect, postMessage);
router.put('/:eventId/pin/:messageId', protect, togglePinMessage);
router.delete('/:eventId/:messageId', protect, deleteMessage);
router.put('/:eventId/react/:messageId', protect, reactToMessage);

export default router;
