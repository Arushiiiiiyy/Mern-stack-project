import User from '../models/User.js';
import Event from '../models/Event.js';
import crypto from 'crypto';

// @desc    Add a new Club/Organizer
// @route   POST /api/admin/organizers
// @access  Private (Admin only)
export const addOrganizer = async (req, res) => {
  try {
    const { name, category, description, contactNumber } = req.body;
    let { email } = req.body;

    // Auto-generate email if not provided
    if (!email) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 20);
      email = `${slug}@felicity.iiit.ac.in`;
    }

    // Check for duplicate organizer name
    const nameExists = await User.findOne({ name: { $regex: `^${name.trim()}$`, $options: 'i' }, role: 'organizer' });
    if (nameExists) {
      return res.status(400).json({ message: 'A club/organizer with this name already exists.' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Organizer already exists with this email' });
    }

    const generatedPassword = crypto.randomBytes(4).toString('hex');

    const organizer = await User.create({
      name,
      email,
      password: generatedPassword,
      role: 'organizer',
      category,
      description,
      contactNumber
    });

    res.status(201).json({
      message: 'Organizer created successfully',
      organizer: {
        id: organizer._id,
        name: organizer.name,
        email: organizer.email,
        assignedPassword: generatedPassword
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all organizers
// @route   GET /api/admin/organizers
// @access  Private (Admin only)
export const getAllOrganizers = async (req, res) => {
  try {
    const organizers = await User.find({ role: 'organizer' })
      .select('-password')
      .sort({ createdAt: -1 });
    res.json(organizers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Remove/Disable an organizer
// @route   DELETE /api/admin/organizers/:id
// @access  Private (Admin only)
export const removeOrganizer = async (req, res) => {
  try {
    const { action } = req.query; // 'disable', 'enable', 'archive', 'delete'
    const organizer = await User.findById(req.params.id);
    if (!organizer || organizer.role !== 'organizer') {
      return res.status(404).json({ message: 'Organizer not found' });
    }

    if (action === 'delete') {
      // Permanently delete organizer and all their events
      await Event.deleteMany({ organizer: req.params.id });
      await User.findByIdAndDelete(req.params.id);
      return res.json({ message: 'Organizer and all their events permanently deleted' });
    } else if (action === 'archive') {
      organizer.archived = true;
      organizer.disabled = true;
      await organizer.save();
      // Store old statuses before closing so we can restore
      await Event.updateMany(
        { organizer: req.params.id, status: { $ne: 'Closed' } },
        { status: 'Closed', previousStatus: 'Published' }
      );
      return res.json({ message: 'Organizer archived. Their events have been closed.', organizer });
    } else if (action === 'unarchive') {
      organizer.archived = false;
      organizer.disabled = false;
      await organizer.save();
      // Restore events that were closed during archiving back to Published
      await Event.updateMany(
        { organizer: req.params.id, status: 'Closed' },
        { status: 'Published' }
      );
      return res.json({ message: 'Organizer unarchived. Their events have been restored.', organizer });
    } else if (action === 'enable') {
      organizer.disabled = false;
      await organizer.save();
      return res.json({ message: 'Organizer re-enabled', organizer });
    } else {
      // Default: disable (events remain visible, club cannot login)
      organizer.disabled = true;
      await organizer.save();
      return res.json({ message: 'Organizer disabled. Events remain visible.', organizer });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all password reset requests
// @route   GET /api/admin/password-resets
// @access  Private (Admin only)
export const getPasswordResetRequests = async (req, res) => {
  try {
    const requests = await User.find({
      role: 'organizer',
      resetPasswordRequested: true
    }).select('name email category resetPasswordReason resetPasswordStatus createdAt');
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve or reject password reset
// @route   PUT /api/admin/password-resets/:id
// @access  Private (Admin only)
export const handlePasswordReset = async (req, res) => {
  try {
    const { action, comment } = req.body; // 'approve' or 'reject'
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (action === 'approve') {
      const newPassword = crypto.randomBytes(4).toString('hex');
      user.password = newPassword;
      user.resetPasswordRequested = false;
      user.resetPasswordStatus = 'Approved';
      user.resetPasswordComment = comment || '';
      user.resetPasswordHistory.push({
        requestedAt: new Date(),
        reason: user.resetPasswordReason,
        status: 'Approved',
        resolvedAt: new Date(),
        comment: comment || ''
      });
      user.resetPasswordReason = '';
      await user.save();

      return res.json({
        message: 'Password reset approved',
        newPassword,
        organizerName: user.name,
        organizerEmail: user.email
      });
    } else if (action === 'reject') {
      user.resetPasswordRequested = false;
      user.resetPasswordStatus = 'Rejected';
      user.resetPasswordComment = comment || '';
      user.resetPasswordHistory.push({
        requestedAt: new Date(),
        reason: user.resetPasswordReason,
        status: 'Rejected',
        resolvedAt: new Date(),
        comment: comment || ''
      });
      user.resetPasswordReason = '';
      await user.save();

      return res.json({ message: 'Password reset rejected' });
    }

    res.status(400).json({ message: 'Invalid action' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Request password reset (organizer calls this)
// @route   POST /api/admin/request-password-reset
// @access  Private (Organizer)
export const requestPasswordReset = async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.resetPasswordRequested = true;
    user.resetPasswordReason = reason;
    user.resetPasswordStatus = 'Pending';
    await user.save();

    res.json({ message: 'Password reset request submitted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};