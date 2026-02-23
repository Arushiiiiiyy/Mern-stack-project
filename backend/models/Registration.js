import mongoose from 'mongoose';

const registrationSchema = new mongoose.Schema({
    // Reference to the user who is attending
    participant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Reference to the event being attended
    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    // Stores answers to the organizer's custom form fields
    responses : [
        {
            label: String,
            value: mongoose.Schema.Types.Mixed // Can store strings, numbers, or file paths
        }
    ],
    // Unique ID for the ticket
    ticketID: {
        type: String,
        unique: true,
        required: true
    },
    statuses: {
        type: String,
        enum: ['Confirmed', 'Pending', 'Cancelled', 'Rejected'],
        default: 'Confirmed'
    },
    paymentProof: { type: String },
    selectedVariants: [{
        name: String,
        option: String
    }],
    quantity: { type: Number, default: 1 },
    attended: { type: Boolean, default: false },
    attendedAt: { type: Date },
    rejectionComment: { type: String },
    statusHistory: [{
        status: String,
        changedAt: { type: Date, default: Date.now },
        comment: String
    }]
}, { timestamps: true });

const Registration = mongoose.model('Registration', registrationSchema);
export default Registration;