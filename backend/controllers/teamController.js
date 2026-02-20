import Team from '../models/Team.js';
import Event from '../models/Event.js';
import Registration from '../models/Registration.js';
import User from '../models/User.js';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { sendRegistrationEmail } from '../utils/sendEmail.js';

/**
 * @desc    Create a team for a hackathon event
 * @route   POST /api/teams
 */
export const createTeam = async (req, res) => {
  try {
    const { eventId, name, teamSize } = req.body;

    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    // Check if user already has a team for this event
    const existingTeam = await Team.findOne({
      event: eventId,
      $or: [
        { leader: req.user._id },
        { 'members.user': req.user._id }
      ]
    });
    if (existingTeam) return res.status(400).json({ message: 'You already have a team for this event' });

    const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    const team = await Team.create({
      event: eventId,
      name,
      leader: req.user._id,
      teamSize,
      inviteCode,
      members: [{ user: req.user._id, status: 'Accepted' }]
    });

    const populated = await Team.findById(team._id)
      .populate('event', 'name startDate endDate venue')
      .populate('leader', 'name email')
      .populate('members.user', 'name email');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Join a team via invite code
 * @route   POST /api/teams/join
 */
export const joinTeam = async (req, res) => {
  try {
    const { inviteCode } = req.body;
    const team = await Team.findOne({ inviteCode });
    if (!team) return res.status(404).json({ message: 'Invalid invite code' });
    if (team.status !== 'Forming') return res.status(400).json({ message: 'Team is no longer accepting members' });

    // Check if already a member
    const isMember = team.members.some(m => m.user.toString() === req.user._id.toString());
    if (isMember) return res.status(400).json({ message: 'You are already in this team' });

    // Check team size
    const acceptedCount = team.members.filter(m => m.status === 'Accepted').length;
    if (acceptedCount >= team.teamSize) return res.status(400).json({ message: 'Team is full' });

    team.members.push({ user: req.user._id, status: 'Accepted' });

    // Check if team is now complete
    const newAcceptedCount = team.members.filter(m => m.status === 'Accepted').length;
    if (newAcceptedCount >= team.teamSize) {
      team.status = 'Complete';

      // Generate tickets for all members
      const event = await Event.findById(team.event);
      const ticketIDs = [];

      for (const member of team.members.filter(m => m.status === 'Accepted')) {
        const ticketID = `FEL-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
        ticketIDs.push(ticketID);

        await Registration.create({
          participant: member.user,
          event: team.event,
          ticketID,
          statuses: 'Confirmed',
          responses: [{ label: 'Team', value: team.name }]
        });
      }

      team.ticketIDs = ticketIDs;
      event.registeredCount += newAcceptedCount;
      await event.save();

      // Broadcast capacity update
      const io = req.app.get('io');
      if (io) {
        io.to(`event-${event._id.toString()}`).emit('capacityUpdate', {
          eventId: event._id.toString(),
          registeredCount: event.registeredCount
        });
      }

      // Send confirmation emails to all team members (non-blocking)
      for (const member of team.members.filter(m => m.status === 'Accepted')) {
        const memberUser = await User.findById(member.user);
        if (memberUser) {
          sendRegistrationEmail({
            to: memberUser.email,
            participantName: memberUser.name,
            eventName: event.name,
            ticketID: ticketIDs[team.members.filter(m => m.status === 'Accepted').indexOf(member)] || ticketIDs[0],
            venue: event.venue,
            startDate: event.startDate,
            type: 'Normal'
          });
        }
      }
    }

    await team.save();
    const populated = await Team.findById(team._id)
      .populate('event', 'name startDate endDate venue')
      .populate('leader', 'name email')
      .populate('members.user', 'name email');
    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get my teams
 * @route   GET /api/teams/my-teams
 */
export const getMyTeams = async (req, res) => {
  try {
    const teams = await Team.find({ 'members.user': req.user._id })
      .populate('event', 'name startDate endDate venue')
      .populate('leader', 'name email')
      .populate('members.user', 'name email');
    res.json(teams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get team by ID
 * @route   GET /api/teams/:id
 */
export const getTeamById = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('event', 'name startDate endDate venue')
      .populate('leader', 'name email')
      .populate('members.user', 'name email');
    if (!team) return res.status(404).json({ message: 'Team not found' });
    res.json(team);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get all teams for a specific event (Organizer view)
 * @route   GET /api/teams/event/:eventId
 */
export const getEventTeams = async (req, res) => {
  try {
    const teams = await Team.find({ event: req.params.eventId })
      .populate('leader', 'name email')
      .populate('members.user', 'name email')
      .sort({ createdAt: -1 });
    res.json(teams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Leave a team (member only, not leader; only if Forming)
 * @route   PUT /api/teams/:id/leave
 */
export const leaveTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    if (team.status !== 'Forming') return res.status(400).json({ message: 'Cannot leave a completed team' });
    if (team.leader.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Team leader cannot leave. Cancel the team instead.' });
    }
    team.members = team.members.filter(m => m.user.toString() !== req.user._id.toString());
    await team.save();
    const populated = await Team.findById(team._id)
      .populate('event', 'name startDate endDate venue')
      .populate('leader', 'name email')
      .populate('members.user', 'name email');
    res.json({ message: 'Left team successfully', team: populated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Cancel a team (leader only, only if Forming)
 * @route   DELETE /api/teams/:id
 */
export const cancelTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    if (team.leader.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the team leader can cancel the team' });
    }
    if (team.status !== 'Forming') {
      return res.status(400).json({ message: 'Cannot cancel a completed team' });
    }
    team.status = 'Cancelled';
    await team.save();
    res.json({ message: 'Team cancelled', team });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
