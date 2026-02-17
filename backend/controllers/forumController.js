import Message from '../models/Message.js';
import Registration from '../models/Registration.js';
import Event from '../models/Event.js';

/**
 * @desc    Get messages for an event forum
 * @route   GET /api/forum/:eventId
 */
export const getMessages = async (req, res) => {
  try {
    const messages = await Message.find({ event: req.params.eventId, deleted: false })
      .populate('user', 'name email role')
      .populate('parentMessage', 'content')
      .populate('reactions.user', 'name')
      .sort({ pinned: -1, createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Post a message to event forum
 * @route   POST /api/forum/:eventId
 */
export const postMessage = async (req, res) => {
  try {
    // Check if user is registered for the event or is the organizer
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const isOrganizer = event.organizer.toString() === req.user._id.toString();
    if (!isOrganizer) {
      const registration = await Registration.findOne({
        participant: req.user._id,
        event: req.params.eventId,
        statuses: 'Confirmed'
      });
      if (!registration) return res.status(403).json({ message: 'Only registered participants can post' });
    }

    const message = await Message.create({
      event: req.params.eventId,
      user: req.user._id,
      content: req.body.content,
      parentMessage: req.body.parentMessage || null,
      isAnnouncement: isOrganizer && req.body.isAnnouncement
    });

    const populated = await Message.findById(message._id)
      .populate('user', 'name email role');

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Pin/Unpin a message (organizer only)
 * @route   PUT /api/forum/:eventId/pin/:messageId
 */
export const togglePinMessage = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    if (event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the organizer can pin messages' });
    }

    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    message.pinned = !message.pinned;
    await message.save();
    res.json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Delete a message (organizer moderation)
 * @route   DELETE /api/forum/:eventId/:messageId
 */
export const deleteMessage = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    const isOrganizer = event.organizer.toString() === req.user._id.toString();
    const isAuthor = message.user.toString() === req.user._id.toString();

    if (!isOrganizer && !isAuthor) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }

    message.deleted = true;
    message.content = '[Message deleted]';
    await message.save();
    res.json({ message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    React to a message
 * @route   PUT /api/forum/:eventId/react/:messageId
 */
export const reactToMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    const { emoji } = req.body;
    const existingReaction = message.reactions.find(
      r => r.user.toString() === req.user._id.toString() && r.emoji === emoji
    );

    if (existingReaction) {
      message.reactions = message.reactions.filter(
        r => !(r.user.toString() === req.user._id.toString() && r.emoji === emoji)
      );
    } else {
      message.reactions.push({ emoji, user: req.user._id });
    }

    await message.save();
    const populated = await Message.findById(message._id)
      .populate('reactions.user', 'name');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
