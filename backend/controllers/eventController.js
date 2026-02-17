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
      merchandiseImage, purchaseLimitPerUser
    } = req.body;

    const event = await Event.create({
      organizer: req.user._id,
      name, description, type, startDate, endDate,
      registrationDeadline, venue, limit, price,
      formFields, variants, tags, eligibility,
      merchandiseImage, purchaseLimitPerUser,
      status: status || 'Draft'
    });

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
    let query = { status: { $in: ['Draft', 'Published', 'Ongoing'] } };

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

    let eventsQuery = Event.find(query).populate('organizer', 'name email category description');

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
        eventsQuery = Event.find(query).populate('organizer', 'name email category description');
      }
    }

    if (followed) {
      const followedIds = followed.split(',');
      query.organizer = { $in: followedIds };
      eventsQuery = Event.find(query).populate('organizer', 'name email category description');
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
//   1. Fetch user's interests and followed organizers
//   2. Query all upcoming published/ongoing events
//   3. Score each event:
//      - +3 if the event's organizer is in user's followed list
//      - +1 for each user interest that matches an event tag (case-insensitive)
//   4. Filter out events user already registered for
//   5. Sort by score (descending), then by start date
//   6. Return top 10
export const getRecommendedEvents = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const userInterests = (user.interests || []).map(i => i.toLowerCase());
    const followedIds = (user.followedOrganizers || []).map(id => id.toString());

    // Get events user already registered for
    const existingRegs = await Registration.find({ participant: req.user._id }).select('event');
    const registeredEventIds = new Set(existingRegs.map(r => r.event.toString()));

    // Get upcoming published/ongoing events
    const events = await Event.find({
      status: { $in: ['Draft', 'Published', 'Ongoing'] },
      startDate: { $gte: new Date() }
    }).populate('organizer', 'name email category description');

    // Score and filter — don't exclude zero-score events from followed clubs
    const scored = events
      .filter(e => !registeredEventIds.has(e._id.toString()))
      .map(event => {
        let score = 0;
        // Boost for followed organizers
        if (event.organizer && followedIds.includes(event.organizer._id.toString())) {
          score += 3;
        }
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

    // Get events with score > 0 (interest/follow matches)
    let results = scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || new Date(a.event.startDate) - new Date(b.event.startDate));

    // If fewer than 10 results, pad with popular upcoming events (by registrations)
    if (results.length < 10) {
      const existingIds = new Set(results.map(r => r.event._id.toString()));
      const filler = scored
        .filter(item => item.score === 0 && !existingIds.has(item.event._id.toString()))
        .sort((a, b) => (b.event.registeredCount || 0) - (a.event.registeredCount || 0))
        .slice(0, 10 - results.length);
      results = [...results, ...filler];
    }

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
      .populate('organizer', 'name email category description contactEmail');
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
export const updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    if (event.organizer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to edit this event' });
    }

    const currentStatus = event.status;

    // If event has registrations, only allow status changes
    if (event.registeredCount > 0) {
      if (req.body.status) event.status = req.body.status;
      else return res.status(400).json({ message: 'Event has registrations. Only status can be changed.' });
    } else if (currentStatus === 'Draft') {
      Object.assign(event, req.body);
    } else if (currentStatus === 'Published') {
      const { description, registrationDeadline, limit, status: newStatus, formFields } = req.body;
      if (description) event.description = description;
      if (registrationDeadline && new Date(registrationDeadline) > event.registrationDeadline) {
        event.registrationDeadline = registrationDeadline;
      }
      if (limit && limit > event.limit) event.limit = limit;
      if (newStatus) event.status = newStatus;
      if (formFields && event.registeredCount === 0) event.formFields = formFields;
    } else if (currentStatus === 'Ongoing' || currentStatus === 'Completed') {
      if (req.body.status) event.status = req.body.status;
    } else if (currentStatus === 'Closed') {
      return res.status(400).json({ message: 'Cannot edit a closed event' });
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
      .populate('participant', 'name email contactNumber college participantType')
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
      .populate('participant', 'name email contactNumber college participantType');

    let csv = 'Name,Email,Contact,College,Type,TicketID,Status,Attended,RegisteredAt\n';
    registrations.forEach(r => {
      csv += `"${r.participant.name}","${r.participant.email}","${r.participant.contactNumber || ''}","${r.participant.college || ''}","${r.participant.participantType}","${r.ticketID}","${r.statuses}","${r.attended}","${r.createdAt}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${event.name}-registrations.csv`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};