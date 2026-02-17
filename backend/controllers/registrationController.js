import Registration from '../models/Registration.js';
import Event from '../models/Event.js';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { sendRegistrationEmail, sendPaymentApprovedEmail } from '../utils/sendEmail.js';

/**
 * @desc    Register a participant for an event
 * @route   POST /api/registrations/:eventId
 */
export const registerForEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.eventId);
        
        if (!event) return res.status(404).json({ message: 'Event not found' });

        // 1. Check Registration Deadline
        if (new Date() > new Date(event.registrationDeadline)) {
            return res.status(400).json({ message: 'Registration deadline has passed' });
        }

        // 2. Check Capacity Limit
        if (event.registeredCount >= event.limit) {
            return res.status(400).json({ message: 'Event is full' });
        }

        // 3. Prevent Duplicate Registration
        const alreadyRegistered = await Registration.findOne({
            participant: req.user._id,
            event: event._id,
            statuses: { $ne: 'Cancelled' }
        });
        if (alreadyRegistered) {
            return res.status(400).json({ message: 'You are already registered' });
        }

        // 4. Eligibility check
        if (event.eligibility && event.eligibility !== 'All') {
            if (req.user.participantType !== event.eligibility) {
                return res.status(403).json({ message: `This event is only for ${event.eligibility} participants` });
            }
        }

        // 5. Generate Unique Ticket ID
        const ticketID = `FEL-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

        // 6. Determine status based on event type
        let regStatus = 'Confirmed';
        if (event.type === 'Merchandise') {
            // Merchandise events need payment approval
            regStatus = 'Pending';
        }

        // 7. Create Registration
        const registration = await Registration.create({
            participant: req.user._id,
            event: event._id,
            responses: req.body.responses || [],
            ticketID,
            statuses: regStatus,
            selectedVariants: req.body.selectedVariants || [],
            quantity: req.body.quantity || 1,
            paymentProof: req.body.paymentProof || null
        });

        // 8. Increment Event Count (for normal events immediately, merch on approval)
        if (event.type !== 'Merchandise') {
            event.registeredCount += 1;
            await event.save();

            // Broadcast live capacity update via Socket.io
            const io = req.app.get('io');
            if (io) {
                io.to(`event-${event._id.toString()}`).emit('capacityUpdate', {
                    eventId: event._id.toString(),
                    registeredCount: event.registeredCount
                });
            }
        }

        // 9. Generate QR for confirmed registrations
        let qrDataUrl = null;
        if (regStatus === 'Confirmed') {
            qrDataUrl = await QRCode.toDataURL(JSON.stringify({
                ticketID,
                event: event.name,
                participant: req.user.name,
                email: req.user.email
            }));
        }

        // 10. Send confirmation email (non-blocking)
        sendRegistrationEmail({
            to: req.user.email,
            participantName: req.user.name,
            eventName: event.name,
            ticketID,
            venue: event.venue,
            startDate: event.startDate,
            type: event.type
        });

        res.status(201).json({ ...registration.toObject(), qrCode: qrDataUrl });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get all events a participant has registered for
 * @route   GET /api/registrations/my-registrations
 */
export const getMyRegistrations = async (req, res) => {
    try {
        const registrations = await Registration.find({ participant: req.user._id })
            .populate({
                path: 'event',
                populate: { path: 'organizer', select: 'name email category' }
            })
            .sort({ createdAt: -1 });
        
        res.json(registrations);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Get QR code for a specific ticket
 * @route   GET /api/registrations/:id/qr
 */
export const getTicketQR = async (req, res) => {
    try {
        const registration = await Registration.findById(req.params.id)
            .populate('event', 'name startDate venue')
            .populate('participant', 'name email');

        if (!registration) return res.status(404).json({ message: 'Registration not found' });
        if (registration.participant._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const qrDataUrl = await QRCode.toDataURL(JSON.stringify({
            ticketID: registration.ticketID,
            event: registration.event.name,
            participant: registration.participant.name,
            email: registration.participant.email
        }));

        res.json({ qrCode: qrDataUrl, ticket: registration });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Cancel a registration
 * @route   PUT /api/registrations/:id/cancel
 */
export const cancelRegistration = async (req, res) => {
    try {
        const registration = await Registration.findById(req.params.id);
        if (!registration) return res.status(404).json({ message: 'Registration not found' });
        if (registration.participant.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        registration.statuses = 'Cancelled';
        await registration.save();

        // Decrement event count
        const event = await Event.findByIdAndUpdate(registration.event, { $inc: { registeredCount: -1 } }, { new: true });

        // Broadcast capacity update
        const io = req.app.get('io');
        if (io && event) {
            io.to(`event-${event._id.toString()}`).emit('capacityUpdate', {
                eventId: event._id.toString(),
                registeredCount: event.registeredCount
            });
        }

        res.json({ message: 'Registration cancelled', registration });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Upload payment proof for merchandise (participant uploads)
 * @route   PUT /api/registrations/:id/payment-proof
 */
export const uploadPaymentProof = async (req, res) => {
    try {
        const registration = await Registration.findById(req.params.id);
        if (!registration) return res.status(404).json({ message: 'Registration not found' });
        if (registration.participant.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        registration.paymentProof = req.file ? `/uploads/${req.file.filename}` : req.body.paymentProof;
        registration.statuses = 'Pending';
        await registration.save();

        res.json({ message: 'Payment proof uploaded', registration });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Approve/Reject merchandise payment (organizer action)
 * @route   PUT /api/registrations/:id/approve
 */
export const approvePayment = async (req, res) => {
    try {
        const registration = await Registration.findById(req.params.id)
            .populate('event')
            .populate('participant', 'name email');
        if (!registration) return res.status(404).json({ message: 'Registration not found' });

        const event = registration.event;
        if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const { action } = req.body; // 'approve' or 'reject'

        if (action === 'approve') {
            registration.statuses = 'Confirmed';
            event.registeredCount += 1;
            await event.save();

            // Broadcast live capacity update
            const io = req.app.get('io');
            if (io) {
                io.to(`event-${event._id.toString()}`).emit('capacityUpdate', {
                    eventId: event._id.toString(),
                    registeredCount: event.registeredCount
                });
            }

            // Generate QR
            const qrDataUrl = await QRCode.toDataURL(JSON.stringify({
                ticketID: registration.ticketID,
                event: event.name,
                participant: registration.participant.name,
                email: registration.participant.email
            }));

            await registration.save();

            // Send approval email (non-blocking)
            sendPaymentApprovedEmail({
                to: registration.participant.email,
                participantName: registration.participant.name,
                eventName: event.name,
                ticketID: registration.ticketID
            });

            return res.json({ message: 'Payment approved', registration, qrCode: qrDataUrl });
        } else if (action === 'reject') {
            registration.statuses = 'Rejected';
            await registration.save();
            return res.json({ message: 'Payment rejected', registration });
        }

        res.status(400).json({ message: 'Invalid action' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};