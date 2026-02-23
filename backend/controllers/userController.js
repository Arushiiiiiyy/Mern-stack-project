import User from '../models/User.js';

/**
 * @desc    Get current user profile
 * @route   GET /api/users/profile
 */
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('followedOrganizers', 'firstName lastName category description email');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 */
export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Participant editable fields
    if (user.role === 'participant') {
      if (req.body.firstName) user.firstName = req.body.firstName;
      if (req.body.lastName !== undefined) user.lastName = req.body.lastName;
      if (req.body.contactNumber) user.contactNumber = req.body.contactNumber;
      if (req.body.college) user.college = req.body.college;
      if (req.body.interests) user.interests = req.body.interests;
      if (req.body.followedOrganizers) user.followedOrganizers = req.body.followedOrganizers;
    }

    // Organizer editable fields
    if (user.role === 'organizer') {
      if (req.body.name) user.firstName = req.body.name;
      if (req.body.category) user.category = req.body.category;
      if (req.body.description) user.description = req.body.description;
      if (req.body.contactEmail) user.contactEmail = req.body.contactEmail;
      if (req.body.contactNumber) user.contactNumber = req.body.contactNumber;
      if (req.body.discordWebhook) user.discordWebhook = req.body.discordWebhook;
    }

    await user.save({ validateModifiedOnly: true });
    const updated = await User.findById(user._id).select('-password');
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Change password
 * @route   PUT /api/users/change-password
 */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    
    if (!(await user.matchPassword(currentPassword))) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    user.password = newPassword;
    await user.save({ validateModifiedOnly: true });
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get all organizers (for clubs listing page)
 * @route   GET /api/users/organizers
 */
export const getOrganizers = async (req, res) => {
  try {
    const organizers = await User.find({ role: 'organizer', disabled: { $ne: true } })
      .select('firstName lastName category description email contactEmail');
    res.json(organizers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get single organizer detail
 * @route   GET /api/users/organizers/:id
 */
export const getOrganizerById = async (req, res) => {
  try {
    const organizer = await User.findById(req.params.id)
      .select('firstName lastName role category description email contactEmail contactNumber');
    if (!organizer || organizer.role !== 'organizer') {
      return res.status(404).json({ message: 'Organizer not found' });
    }

    // Also fetch this organizer's events
    const Event = (await import('../models/Event.js')).default;
    const events = await Event.find({ organizer: req.params.id })
      .sort({ startDate: -1 });

    // Check if current user follows this organizer
    let isFollowing = false;
    if (req.headers.authorization) {
      try {
        const jwt = await import('jsonwebtoken');
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.default.verify(token, process.env.JWT_SECRET);
        const currentUser = await User.findById(decoded.id);
        if (currentUser) {
          isFollowing = currentUser.followedOrganizers.includes(req.params.id);
        }
      } catch {}
    }

    res.json({ organizer, events, isFollowing });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Follow/Unfollow an organizer
 * @route   PUT /api/users/follow/:organizerId
 */
export const toggleFollowOrganizer = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const orgId = req.params.organizerId;

    const idx = user.followedOrganizers.findIndex(id => id.toString() === orgId.toString());
    if (idx > -1) {
      user.followedOrganizers.splice(idx, 1);
    } else {
      user.followedOrganizers.push(orgId);
    }

    await user.save({ validateModifiedOnly: true });
    res.json({ followedOrganizers: user.followedOrganizers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
