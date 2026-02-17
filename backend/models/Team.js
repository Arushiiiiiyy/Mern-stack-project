import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  name: { type: String, required: true },
  leader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['Pending', 'Accepted', 'Rejected'], default: 'Pending' },
    invitedAt: { type: Date, default: Date.now }
  }],
  teamSize: { type: Number, required: true },
  inviteCode: { type: String, unique: true, required: true },
  status: {
    type: String,
    enum: ['Forming', 'Complete', 'Cancelled'],
    default: 'Forming'
  },
  ticketIDs: [String]
}, { timestamps: true });

const Team = mongoose.model('Team', teamSchema);
export default Team;
