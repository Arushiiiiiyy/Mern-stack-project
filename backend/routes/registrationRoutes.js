import express from 'express';
import { registerForEvent, getMyRegistrations, getTicketQR, cancelRegistration, uploadPaymentProof, approvePayment } from '../controllers/registrationController.js';
import { protect, organizerOnly } from '../middleware/authMiddleware.js';
import multer from 'multer';

// Multer setup for payment proof uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads'),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

const router = express.Router();

// Participant routes
router.get('/my-registrations', protect, getMyRegistrations);
router.post('/:eventId', protect, registerForEvent);
router.get('/:id/qr', protect, getTicketQR);
router.put('/:id/cancel', protect, cancelRegistration);
router.put('/:id/payment-proof', protect, upload.single('paymentProof'), uploadPaymentProof);

// Organizer routes (merchandise approval)
router.put('/:id/approve', protect, organizerOnly, approvePayment);

export default router;