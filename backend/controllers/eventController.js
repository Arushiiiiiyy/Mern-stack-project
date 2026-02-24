import Event from '../models/Event.js';
import Registration from '../models/Registration.js';
import User from '../models/User.js';

// @desc    Create a new event
// @route   POST /api/events
// @access  Private (Organizer only)
export const createEvent = async (req, res) => {
  try {
    const {
      name, description, type, startDate, endDate,
      registrationDeadline, venue, limit, price,
      formFields, variants, tags, status, eligibility,
      merchandiseImage, purchaseLimitPerUser,
      isTeamEvent, minTeamSize, maxTeamSize
    } = req.body;

    // Check for duplicate event name
    const existingEvent = await Event.findOne({ name: { $regex: `^${name.trim()}$`, $options: 'i' } });
    if (existingEvent) {
      return res.status(400).json({ message: 'An event with this name already exists. Please choose a different name.' });
    }

    // Validate dates are logical
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);
    const regDeadline = new Date(registrationDeadline);

    if (start <= now) {
      return res.status(400).json({ message: 'Start date must be in the future.' });
    }
    if (end <= now) {
      return res.status(400).json({ message: 'End date must be in the future.' });
    }
    if (regDeadline <= now) {
      return res.status(400).json({ message: 'Registration deadline must be in the future.' });
    }
    if (end <= start) {
      return res.status(400).json({ message: 'End date/time must be after start date/time.' });
    }
    if (regDeadline >= end) {
      return res.status(400).json({ message: 'Registration deadline must be before the event end date/time.' });
    }

    const event = await Event.create({
      organizer: req.user._id,
      name, description, type, startDate, endDate,
      registrationDeadline, venue, limit, price,
      formFields, variants, tags, eligibility,
      merchandiseImage, purchaseLimitPerUser,
      isTeamEvent, minTeamSize, maxTeamSize,
      status: status || 'Draft'
    });

    // Discord Webhook: auto-post new event to organizer's Discord
    try {
      const organizer = await User.findById(req.user._id);
      if (organizer?.discordWebhook) {
        const dateStr = start.toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
        const webhookPayload = {
          embeds: [{
            title: `🎉 New Event: ${name}`,
            description: description?.slice(0, 300) || '',
            color: type === 'Merchandise' ? 0xa855f7 : 0x3b82f6,
            fields: [
              { name: ' Date', value: dateStr, inline: true },
              { name: ' Venue', value: venue, inline: true },
              { name: ' Price', value: price > 0 ? `₹${price}` : 'Free', inline: true },
              { name: ' Capacity', value: `${limit}`, inline: true },
              { name: ' Type', value: type, inline: true }
            ],
            footer: { text: `By ${organizer.name} • Felicity 2026` },
            timestamp: new Date().toISOString()
          }]
        };
        fetch(organizer.discordWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload)
        }).catch(e => console.error('Discord webhook failed:', e.message));
      }
    } catch (discordErr) {
      console.error('Discord webhook error:', discordErr.message);
    }

    res.status(201).json(event);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get all published events (For Browse Page)
// @route   GET /api/events
// @access  Public
export const getEvents = async (req, res) => {
  try {
    const { search, type, eligibility, startDate, endDate, followed, trending } = req.query;
    let query = { status: { $in: ['Published', 'Ongoing'] }, endDate: { $gte: new Date() } };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }
    if (type) query.type = type;
    if (eligibility && eligibility !== 'All') query.eligibility = { $in: [eligibility, 'All'] };
    if (startDate) query.startDate = { $gte: new Date(startDate) };
    if (endDate) query.endDate = { ...(query.endDate || {}), $lte: new Date(endDate) };

    let eventsQuery = Event.find(query).populate('organizer', 'firstName lastName email category description');

    if (trending === 'true') {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const trendingRegs = await Registration.aggregate([
        { $match: { createdAt: { $gte: oneDayAgo } } },
        { $group: { _id: '$event', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]);
      const trendingIds = trendingRegs.map(r => r._id);
      if (trendingIds.length > 0) {
        query._id = { $in: trendingIds };
        eventsQuery = Event.find(query).populate('organizer', 'firstName lastName email category description');
      } else {
        // Fallback: top 5 by registeredCount overall when no 24h registrations
        eventsQuery = Event.find(query).populate('organizer', 'firstName lastName email category description').sort({ registeredCount: -1 }).limit(5);
      }
    }

    if (followed) {
      const followedIds = followed.split(',');
      query.organizer = { $in: followedIds };
      eventsQuery = Event.find(query).populate('organizer', 'firstName lastName email category description');
    }

    const events = await eventsQuery.sort({ startDate: 1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get recommended events for the logged-in user
// @route   GET /api/events/recommended
// @access  Private
// Recommendation Logic:
//   1. Fetch user's followed organizers
//   2. Query upcoming published/ongoing events ONLY from followed organizers
//   3. Score each event by interest-tag matches for ordering
//   4. Filter out events user already registered for
//   5. Sort by score (descending), then by start date
//   6. Return top 10
export const getRecommendedEvents = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const userInterests = (user.interests || []).map(i => i.toLowerCase());
    const followedIds = (user.followedOrganizers || []).map(id => id.toString());

    // If user doesn't follow any clubs, return empty
    if (followedIds.length === 0) {
      return res.json([]);
    }

    // Get events user already registered for
    const existingRegs = await Registration.find({ participant: req.user._id }).select('event');
    const registeredEventIds = new Set(existingRegs.map(r => r.event.toString()));

    // Get upcoming published/ongoing events ONLY from followed organizers
    const events = await Event.find({
      status: { $in: ['Published', 'Ongoing'] },
      endDate: { $gte: new Date() },
      organizer: { $in: followedIds }
    }).populate('organizer', 'firstName lastName email category description');

    // Score by interest-tag match for ordering, filter out already registered
    const scored = events
      .filter(e => !registeredEventIds.has(e._id.toString()))
      .map(event => {
        let score = 0;
        // Boost for matching interests vs tags
        if (event.tags && event.tags.length > 0) {
          event.tags.forEach(tag => {
            if (userInterests.includes(tag.toLowerCase())) {
              score += 1;
            }
          });
        }
        return { event, score };
      });

    // Sort by score desc, then by start date asc
    const results = scored
      .sort((a, b) => b.score - a.score || new Date(a.event.startDate) - new Date(b.event.startDate));

    res.json(results.slice(0, 10).map(item => item.event));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single event by ID
// @route   GET /api/events/:id
// @access  Public
export const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('organizer', 'firstName lastName email category description contactEmail');
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json(event);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Organizer's own events (For Dashboard)
// @route   GET /api/events/my-events
// @access  Private (Organizer)
export const getMyEvents = async (req, res) => {
  try {
    const events = await Event.find({ organizer: req.user._id });
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update an event
// @route   PUT /api/events/:id
// @access  Private (Organizer owner only)
// Valid state transitions: each key maps to allowed next states
const VALID_TRANSITIONS = {
  Draft: ['Published'],
  Published: ['Ongoing', 'Closed'],
  Ongoing: ['Completed', 'Closed'],
  Completed: ['Closed'],
  Closed: []
};

export const updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to edit this event' });
    }

    const currentStatus = event.status;

    // Validate status transition if a new status is requested
    if (req.body.status && req.body.status !== currentStatus) {
      const allowed = VALID_TRANSITIONS[currentStatus] || [];
      if (!allowed.includes(req.body.status)) {
        return res.status(400).json({
          message: `Cannot transition from "${currentStatus}" to "${req.body.status}". Allowed: ${allowed.join(', ') || 'none'}`
        });
      }
    }

    // Block all edits on Closed events
    if (currentStatus === 'Closed') {
      return res.status(400).json({ message: 'Cannot edit a closed event' });
    }

    // If event has registrations (including pending merchandise), only allow status changes
    const actualRegCount = await Registration.countDocuments({
      event: event._id,
      statuses: { $nin: ['Cancelled', 'Rejected'] }
    });
    if (actualRegCount > 0) {
      if (req.body.status) event.status = req.body.status;
      else return res.status(400).json({ message: `Event has ${actualRegCount} registration(s). Only status can be changed.` });
    } else if (currentStatus === 'Draft' || currentStatus === 'Published') {
      // Validate dates if provided
      const start = new Date(req.body.startDate || event.startDate);
      const end = new Date(req.body.endDate || event.endDate);
      const regDeadline = new Date(req.body.registrationDeadline || event.registrationDeadline);
      const now = new Date();

      if (start <= now) return res.status(400).json({ message: 'Start date must be in the future.' });
      if (end <= now) return res.status(400).json({ message: 'End date must be in the future.' });
      if (regDeadline <= now) return res.status(400).json({ message: 'Registration deadline must be in the future.' });
      if (end <= start) return res.status(400).json({ message: 'End date/time must be after start date/time.' });
      if (regDeadline >= end) return res.status(400).json({ message: 'Registration deadline must be before the event end date/time.' });

      // With 0 registrations, allow free editing in both Draft and Published states
      Object.assign(event, req.body);
    } else if (currentStatus === 'Ongoing' || currentStatus === 'Completed') {
      if (req.body.status) event.status = req.body.status;
    }

    await event.save();
    res.json(event);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get all registrations for an event (Organizer view)
// @route   GET /api/events/:id/registrations
// @access  Private (Organizer owner)
export const getEventRegistrations = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { search, status } = req.query;
    let query = { event: req.params.id };
    if (status) query.statuses = status;

    let registrations = await Registration.find(query)
      .populate('participant', 'firstName lastName email contactNumber college participantType')
      .sort({ createdAt: -1 });

    if (search) {
      registrations = registrations.filter(r =>
        r.participant.name.toLowerCase().includes(search.toLowerCase()) ||
        r.participant.email.toLowerCase().includes(search.toLowerCase())
      );
    }

    res.json(registrations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Export event registrations as CSV
// @route   GET /api/events/:id/registrations/export
// @access  Private (Organizer owner)
export const exportRegistrations = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const registrations = await Registration.find({ event: req.params.id })
      .populate('participant', 'firstName lastName email contactNumber college participantType');

    // Build dynamic header from event's form fields
    const formLabels = (event.formFields || []).map(f => f.label);
    let csv = 'Name,Email,Contact,College,Type,TicketID,Status,Attended,RegisteredAt';
    formLabels.forEach(label => { csv += `,"${label}"`; });
    csv += '\n';

    registrations.forEach(r => {
      csv += `"${r.participant.name}","${r.participant.email}","${r.participant.contactNumber || ''}","${r.participant.college || ''}","${r.participant.participantType}","${r.ticketID}","${r.statuses}","${r.attended}","${r.createdAt}"`;
      // Append custom form field responses
      formLabels.forEach(label => {
        const resp = (r.responses || []).find(res => res.label === label);
        csv += `,"${resp ? String(resp.value).replace(/"/g, '""') : ''}"`;
      });
      csv += '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${event.name}-registrations.csv`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get analytics for an organizer's events
// @route   GET /api/events/analytics
// @access  Private (Organizer only)
export const getOrganizerAnalytics = async (req, res) => {
  try {
    const events = await Event.find({ organizer: req.user._id });
    const eventIds = events.map(e => e._id);

    // Aggregate attendance and status stats across all organizer events
    const regStats = await Registration.aggregate([
      { $match: { event: { $in: eventIds } } },
      {
        $group: {
          _id: '$event',
          total: { $sum: 1 },
          confirmed: { $sum: { $cond: [{ $eq: ['$statuses', 'Confirmed'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$statuses', 'Pending'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$statuses', 'Cancelled'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$statuses', 'Rejected'] }, 1, 0] } },
          attended: { $sum: { $cond: ['$attended', 1, 0] } }
        }
      }
    ]);

    // Map stats to event objects
    const statsMap = {};
    regStats.forEach(s => { statsMap[s._id.toString()] = s; });

    const analytics = events.map(ev => {
      const stats = statsMap[ev._id.toString()] || { total: 0, confirmed: 0, pending: 0, cancelled: 0, rejected: 0, attended: 0 };
      return {
        _id: ev._id,
        name: ev.name,
        type: ev.type,
        status: ev.status,
        limit: ev.limit,
        price: ev.price,
        startDate: ev.startDate,
        endDate: ev.endDate,
        registeredCount: ev.registeredCount,
        registrations: stats.total,
        confirmed: stats.confirmed,
        pending: stats.pending,
        cancelled: stats.cancelled,
        rejected: stats.rejected,
        attended: stats.attended,
        fillRate: ev.limit ? Math.round((ev.registeredCount / ev.limit) * 100) : 0,
        attendanceRate: stats.confirmed > 0 ? Math.round((stats.attended / stats.confirmed) * 100) : 0,
        revenue: (ev.price || 0) * (stats.confirmed || 0)
      };
    });

    // Overall totals
    const totals = {
      totalEvents: events.length,
      totalRegistrations: analytics.reduce((s, a) => s + a.registrations, 0),
      totalConfirmed: analytics.reduce((s, a) => s + a.confirmed, 0),
      totalAttended: analytics.reduce((s, a) => s + a.attended, 0),
      totalRevenue: analytics.reduce((s, a) => s + a.revenue, 0),
      avgFillRate: analytics.length > 0 ? Math.round(analytics.reduce((s, a) => s + a.fillRate, 0) / analytics.length) : 0,
      avgAttendanceRate: analytics.filter(a => a.confirmed > 0).length > 0
        ? Math.round(analytics.filter(a => a.confirmed > 0).reduce((s, a) => s + a.attendanceRate, 0) / analytics.filter(a => a.confirmed > 0).length)
        : 0
    };

    res.json({ totals, events: analytics });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};