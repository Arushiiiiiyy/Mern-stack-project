import Registration from '../models/Registration.js';
import Event from '../models/Event.js';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { sendRegistrationEmail, sendPaymentApprovedEmail } from '../utils/sendEmail.js';

/**
 * Generate a cryptographically strong unique ticket ID (UUID-style)
 */
const generateTicketID = () => {
    return `FEL-${crypto.randomUUID().split('-').slice(0, 2).join('').toUpperCase()}`;
};

/**
 * Generate a signed QR payload with HMAC to prevent tampering
 */
const generateSignedQR = async (data) => {
    const payload = JSON.stringify(data);
    const secret = process.env.JWT_SECRET || 'felicity-qr-secret';
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex').slice(0, 12);
    const signedData = { ...data, sig: signature };
    const qrDataUrl = await QRCode.toDataURL(JSON.stringify(signedData));
    return qrDataUrl;
};

/**
 * @desc    Register a participant for an event
 * @route   POST /api/registrations/:eventId
 */
export const registerForEvent = async (req, res) => {
    try {
        const event = await Event.findById(req.params.eventId);
        
        if (!event) return res.status(404).json({ message: 'Event not found' });

        // 0a. Check if event has already ended
        if (new Date() > new Date(event.endDate)) {
            return res.status(400).json({ message: 'This event has already ended' });
        }

        // 0b. Check if event status allows registration
        if (!['Published', 'Ongoing'].includes(event.status)) {
            return res.status(400).json({ message: 'Registration is not open for this event' });
        }

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
            statuses: { $nin: ['Cancelled', 'Rejected'] }
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

        // 4b. Purchase limit check for merchandise events
        if (event.type === 'Merchandise' && event.purchaseLimitPerUser) {
            const existingPurchases = await Registration.countDocuments({
                participant: req.user._id,
                event: event._id,
                statuses: { $nin: ['Cancelled', 'Rejected'] }
            });
            if (existingPurchases >= event.purchaseLimitPerUser) {
                return res.status(400).json({ message: `Purchase limit reached (max ${event.purchaseLimitPerUser} per user)` });
            }
        }

        // 4c. Stock check for merchandise variants (atomic check)
        if (event.type === 'Merchandise' && req.body.selectedVariants?.length > 0) {
            for (const sv of req.body.selectedVariants) {
                const variant = event.variants?.find(v => v.name === sv.name);
                if (variant && variant.stock !== undefined && variant.stock !== null && variant.stock <= 0) {
                    return res.status(400).json({ message: `Variant "${sv.name}" is out of stock` });
                }
            }
        }

        // 5. Generate Unique Ticket ID (UUID-based)
        const ticketID = generateTicketID();

        // 6. Determine status based on event type
        // Merchandise: Pending (needs payment approval) — no stock decrement, no QR yet
        // Normal: Confirmed immediately
        // Normal with price > 0: Pending (needs payment proof + approval)
        let regStatus = 'Confirmed';
        if (event.type === 'Merchandise') {
            regStatus = 'Pending';
        } else if (event.price > 0) {
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

        // 8. For free Normal events: increment count + decrement stock immediately
        //    For Merchandise events or paid Normal events: do NOT increment count or decrement stock until approved
        let qrDataUrl = null;
        if (event.type !== 'Merchandise' && event.price <= 0) {
            event.registeredCount += 1;
            await event.save();

            // Generate signed QR for confirmed registrations
            qrDataUrl = await generateSignedQR({
                ticketID,
                event: event.name,
                eventId: event._id.toString(),
                participant: req.user.name,
                email: req.user.email
            });

            // Send confirmation email with QR (non-blocking)
            sendRegistrationEmail({
                to: req.user.email,
                participantName: req.user.name,
                eventName: event.name,
                ticketID,
                venue: event.venue,
                startDate: event.startDate,
                type: event.type,
                qrDataUrl
            });
        } else {
            // Merchandise or paid Normal: just save, send a pending order email (no QR)
            sendRegistrationEmail({
                to: req.user.email,
                participantName: req.user.name,
                eventName: event.name,
                ticketID,
                venue: event.venue,
                startDate: event.startDate,
                type: event.type === 'Merchandise' ? 'Merchandise' : 'PaidNormal'
            });
        }

        // Broadcast live capacity update via Socket.io
        const io = req.app.get('io');
        if (io) {
            io.to(`event-${event._id.toString()}`).emit('capacityUpdate', {
                eventId: event._id.toString(),
                registeredCount: event.registeredCount
            });
        }

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
                populate: { path: 'organizer', select: 'firstName lastName email category' }
            })
            .sort({ createdAt: -1 });

        // Attach team name for team events
        const Team = (await import('../models/Team.js')).default;
        const regsWithTeams = await Promise.all(registrations.map(async (reg) => {
            const regObj = reg.toObject();
            if (reg.event?.isTeamEvent) {
                const team = await Team.findOne({
                    event: reg.event._id,
                    $or: [
                        { leader: req.user._id },
                        { 'members.user': req.user._id }
                    ],
                    status: { $ne: 'Cancelled' }
                }).select('name');
                if (team) regObj.teamName = team.name;
            }
            return regObj;
        }));

        res.json(regsWithTeams);
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
            .populate('participant', 'firstName lastName email');

        if (!registration) return res.status(404).json({ message: 'Registration not found' });
        if (registration.participant._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        // Only generate QR for confirmed registrations
        if (registration.statuses !== 'Confirmed') {
            return res.status(400).json({ message: 'QR code is only available for confirmed registrations' });
        }

        const qrDataUrl = await generateSignedQR({
            ticketID: registration.ticketID,
            event: registration.event.name,
            eventId: registration.event._id.toString(),
            participant: registration.participant.name,
            email: registration.participant.email
        });

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
 * @desc    Upload payment proof for paid events (participant uploads)
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
 * @desc    Approve/Reject payment for paid events (organizer action)
 * @route   PUT /api/registrations/:id/approve
 */
export const approvePayment = async (req, res) => {
    try {
        const registration = await Registration.findById(req.params.id)
            .populate('event')
            .populate('participant', 'firstName lastName email');
        if (!registration) return res.status(404).json({ message: 'Registration not found' });

        const event = registration.event;
        if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const { action, comment } = req.body; // 'approve' or 'reject'

        if (action === 'approve') {
            // Check stock is still available before approving
            if (registration.selectedVariants?.length > 0) {
                const freshEvent = await Event.findById(event._id);
                for (const sv of registration.selectedVariants) {
                    const variant = freshEvent.variants?.find(v => v.name === sv.name);
                    if (variant && variant.stock !== undefined && variant.stock !== null && variant.stock <= 0) {
                        return res.status(400).json({ message: `Variant "${sv.name}" is out of stock. Cannot approve.` });
                    }
                }
            }

            registration.statuses = 'Confirmed';

            // NOW decrement stock (only on approval per PDF spec)
            const freshEvent = await Event.findById(event._id);
            if (registration.selectedVariants?.length > 0) {
                for (const sv of registration.selectedVariants) {
                    const variant = freshEvent.variants?.find(v => v.name === sv.name);
                    if (variant && variant.stock !== undefined && variant.stock !== null) {
                        variant.stock = Math.max(0, variant.stock - 1);
                    }
                }
            }
            // Increment registered count on approval
            freshEvent.registeredCount += 1;
            await freshEvent.save();

            // Generate signed QR on approval
            const qrDataUrl = await generateSignedQR({
                ticketID: registration.ticketID,
                event: event.name,
                eventId: event._id.toString(),
                participant: registration.participant.name,
                email: registration.participant.email
            });

            // Add approval to status history
            if (!registration.statusHistory) registration.statusHistory = [];
            registration.statusHistory.push({
                status: 'Confirmed',
                changedAt: new Date(),
                comment: comment || 'Payment approved'
            });

            await registration.save();

            // Broadcast capacity update
            const io = req.app.get('io');
            if (io) {
                io.to(`event-${event._id.toString()}`).emit('capacityUpdate', {
                    eventId: event._id.toString(),
                    registeredCount: freshEvent.registeredCount
                });
            }

            // Send approval email with QR (non-blocking)
            sendPaymentApprovedEmail({
                to: registration.participant.email,
                participantName: registration.participant.name,
                eventName: event.name,
                ticketID: registration.ticketID,
                qrDataUrl
            });

            return res.json({ message: 'Payment approved', registration, qrCode: qrDataUrl });
        } else if (action === 'reject') {
            registration.statuses = 'Rejected';
            // No stock to restore — stock was never decremented for pending orders
            // No count to decrement — count was never incremented for pending orders

            // Add rejection to status history
            if (!registration.statusHistory) registration.statusHistory = [];
            registration.statusHistory.push({
                status: 'Rejected',
                changedAt: new Date(),
                comment: comment || 'Payment rejected'
            });
            registration.rejectionComment = comment || '';

            await registration.save();
            return res.json({ message: 'Payment rejected', registration });
        }

        res.status(400).json({ message: 'Invalid action' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Mark a registration as attended (organizer action)
 * @route   PUT /api/registrations/:id/attend
 */
export const markAttendance = async (req, res) => {
    try {
        const registration = await Registration.findById(req.params.id)
            .populate('event');
        if (!registration) return res.status(404).json({ message: 'Registration not found' });

        const event = registration.event;
        if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        if (registration.statuses !== 'Confirmed') {
            return res.status(400).json({ message: 'Only confirmed registrations can be marked as attended' });
        }

        if (registration.attended) {
            return res.status(400).json({ message: 'Already marked as attended (duplicate scan rejected)' });
        }

        registration.attended = true;
        registration.attendedAt = new Date();
        await registration.save();

        res.json({ message: 'Attendance marked', registration });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * @desc    Verify a QR code ticket (backend verification to prevent tampering)
 * @route   POST /api/registrations/verify-qr
 */
export const verifyQR = async (req, res) => {
    try {
        const { ticketID, sig, eventId } = req.body;
        if (!ticketID) return res.status(400).json({ valid: false, message: 'No ticket ID' });

        // Verify HMAC signature
        const secret = process.env.JWT_SECRET || 'felicity-qr-secret';
        const registration = await Registration.findOne({ ticketID })
            .populate('event', 'name startDate venue organizer')
            .populate('participant', 'firstName lastName email');

        if (!registration) {
            return res.json({ valid: false, message: 'Ticket not found' });
        }

        // Verify this ticket belongs to the correct event
        if (eventId && registration.event._id.toString() !== eventId) {
            return res.json({ valid: false, message: 'Ticket does not belong to this event' });
        }

        // Check organizer authorization
        if (registration.event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ valid: false, message: 'Not authorized to verify tickets for this event' });
        }

        if (registration.statuses !== 'Confirmed') {
            return res.json({ valid: false, message: `Ticket status: ${registration.statuses}` });
        }

        // Verify HMAC signature if provided
        if (sig) {
            const payload = JSON.stringify({
                ticketID,
                event: registration.event.name,
                eventId: registration.event._id.toString(),
                participant: registration.participant.name,
                email: registration.participant.email
            });
            const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex').slice(0, 12);
            if (sig !== expected) {
                return res.json({ valid: false, message: 'QR signature invalid — possible tampering' });
            }
        }

        // Check duplicate attendance
        if (registration.attended) {
            return res.json({
                valid: true,
                alreadyScanned: true,
                message: 'Already scanned',
                attendedAt: registration.attendedAt,
                participant: registration.participant,
                ticketID
            });
        }

        res.json({
            valid: true,
            alreadyScanned: false,
            participant: registration.participant,
            event: registration.event,
            ticketID,
            registrationId: registration._id
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};