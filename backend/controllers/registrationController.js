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
        if (event.type === 'Merchandise') {
            // Merchandise: registeredCount = confirmed only; also count pending towards capacity
            const pendingRegCount = await Registration.countDocuments({
                event: event._id,
                statuses: 'Pending'
            });
            if (event.registeredCount + pendingRegCount >= event.limit) {
                return res.status(400).json({ message: 'Event is full (all spots are reserved or confirmed)' });
            }
        } else {
            // Normal events: registeredCount includes everyone (incremented at registration)
            if (event.registeredCount >= event.limit) {
                return res.status(400).json({ message: 'Event is full' });
            }
        }

        // 3. Prevent Duplicate Registration (for non-merchandise events only)
        //    Merchandise allows multiple purchases up to purchaseLimitPerUser
        if (event.type !== 'Merchandise') {
            const alreadyRegistered = await Registration.findOne({
                participant: req.user._id,
                event: event._id,
                statuses: { $nin: ['Cancelled', 'Rejected'] }
            });
            if (alreadyRegistered) {
                return res.status(400).json({ message: 'You are already registered' });
            }
        }

        // 4. Eligibility check
        if (event.eligibility && event.eligibility !== 'All') {
            if (req.user.participantType !== event.eligibility) {
                return res.status(403).json({ message: `This event is only for ${event.eligibility} participants` });
            }
        }

        // 4b. Purchase limit check for merchandise events (counted by total quantity)
        const requestedQty = parseInt(req.body.quantity) || 1;
        if (event.type === 'Merchandise' && event.purchaseLimitPerUser) {
            const existingPurchases = await Registration.aggregate([
                { $match: { participant: req.user._id, event: event._id, statuses: { $nin: ['Cancelled', 'Rejected'] } } },
                { $group: { _id: null, totalQty: { $sum: '$quantity' } } }
            ]);
            const currentTotal = existingPurchases[0]?.totalQty || 0;
            if (currentTotal + requestedQty > event.purchaseLimitPerUser) {
                return res.status(400).json({ message: `Purchase limit reached. Max ${event.purchaseLimitPerUser} per user, you already have ${currentTotal}.` });
            }
        }

        // 4c. Stock check for merchandise variants (account for pending orders)
        if (event.type === 'Merchandise' && req.body.selectedVariants?.length > 0) {
            // Group requested quantity per variant name for stock check
            const variantQtyMap = {};
            for (const sv of req.body.selectedVariants) {
                variantQtyMap[sv.name] = (variantQtyMap[sv.name] || 0) + (sv.quantity || 1);
            }

            // Count pending (not yet approved) orders per variant to calculate available stock
            const pendingVariantQtys = await Registration.aggregate([
                { $match: { event: event._id, statuses: 'Pending' } },
                { $unwind: '$selectedVariants' },
                { $group: { _id: '$selectedVariants.name', totalQty: { $sum: { $ifNull: ['$selectedVariants.quantity', 1] } } } }
            ]);
            const pendingMap = {};
            pendingVariantQtys.forEach(v => { pendingMap[v._id] = v.totalQty; });

            for (const [varName, qty] of Object.entries(variantQtyMap)) {
                const variant = event.variants?.find(v => v.name === varName);
                if (variant && variant.stock !== undefined && variant.stock !== null) {
                    const reservedByPending = pendingMap[varName] || 0;
                    const availableStock = variant.stock - reservedByPending;
                    if (availableStock < qty) {
                        return res.status(400).json({ message: `Variant "${varName}" has only ${availableStock} available (${reservedByPending} reserved by pending orders)` });
                    }
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
            quantity: requestedQty,
            paymentProof: req.body.paymentProof || null
        });

        // 8. Capacity & QR logic
        let qrDataUrl = null;
        if (event.type !== 'Merchandise') {
            // NORMAL events (free or paid): always +1 at registration time
            event.registeredCount += 1;
            await event.save();

            if (event.price <= 0) {
                // Free normal: confirmed immediately → generate QR
                qrDataUrl = await generateSignedQR({
                    ticketID,
                    event: event.name,
                    eventId: event._id.toString(),
                    participant: req.user.name,
                    email: req.user.email
                });
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
                // Paid normal: pending, counted in capacity but no QR yet
                sendRegistrationEmail({
                    to: req.user.email,
                    participantName: req.user.name,
                    eventName: event.name,
                    ticketID,
                    venue: event.venue,
                    startDate: event.startDate,
                    type: 'PaidNormal'
                });
            }
        } else {
            // MERCHANDISE: do NOT increment registeredCount (only on approval)
            sendRegistrationEmail({
                to: req.user.email,
                participantName: req.user.name,
                eventName: event.name,
                ticketID,
                venue: event.venue,
                startDate: event.startDate,
                type: 'Merchandise'
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

        const wasConfirmed = registration.statuses === 'Confirmed';
        registration.statuses = 'Cancelled';
        await registration.save();

        const event = await Event.findById(registration.event);
        if (event) {
            if (event.type === 'Merchandise') {
                // Merchandise: only decrement registeredCount if was Confirmed
                // Pending merch orders were never in registeredCount
                if (wasConfirmed) {
                    event.registeredCount = Math.max(0, event.registeredCount - 1);
                    // Restore variant stock (was decremented on approval)
                    if (registration.selectedVariants?.length > 0) {
                        for (const sv of registration.selectedVariants) {
                            const variant = event.variants?.find(v => v.name === sv.name);
                            if (variant && variant.stock !== undefined && variant.stock !== null) {
                                variant.stock += (sv.quantity || 1);
                            }
                        }
                    }
                }
            } else {
                // Normal events: always decrement (was counted +1 at registration regardless of status)
                event.registeredCount = Math.max(0, event.registeredCount - 1);
            }
            await event.save();
        }

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
            const qty = registration.quantity || 1;
            const freshEvent = await Event.findById(event._id);

            // Check stock is still available before approving (merchandise only)
            if (registration.selectedVariants?.length > 0) {
                const variantQtyMap = {};
                for (const sv of registration.selectedVariants) {
                    variantQtyMap[sv.name] = (variantQtyMap[sv.name] || 0) + (sv.quantity || 1);
                }
                for (const [varName, needed] of Object.entries(variantQtyMap)) {
                    const variant = freshEvent.variants?.find(v => v.name === varName);
                    if (variant && variant.stock !== undefined && variant.stock !== null && variant.stock < needed) {
                        return res.status(400).json({ message: `Variant "${varName}" has only ${variant.stock} in stock. Cannot approve.` });
                    }
                }
            }

            registration.statuses = 'Confirmed';

            // Decrement stock on approval (merchandise)
            if (registration.selectedVariants?.length > 0) {
                for (const sv of registration.selectedVariants) {
                    const variant = freshEvent.variants?.find(v => v.name === sv.name);
                    if (variant && variant.stock !== undefined && variant.stock !== null) {
                        variant.stock = Math.max(0, variant.stock - (sv.quantity || 1));
                    }
                }
            }

            // Only increment registeredCount for Merchandise events
            // Normal events already counted +1 at registration time
            if (event.type === 'Merchandise') {
                freshEvent.registeredCount += qty;
            }
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

            // For normal events: decrement registeredCount (was counted at registration)
            // For merchandise: no change (count was never incremented for pending)
            if (event.type !== 'Merchandise') {
                const freshEvent = await Event.findById(event._id);
                freshEvent.registeredCount = Math.max(0, freshEvent.registeredCount - (registration.quantity || 1));
                await freshEvent.save();

                // Broadcast capacity update
                const io = req.app.get('io');
                if (io) {
                    io.to(`event-${event._id.toString()}`).emit('capacityUpdate', {
                        eventId: event._id.toString(),
                        registeredCount: freshEvent.registeredCount
                    });
                }
            }

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