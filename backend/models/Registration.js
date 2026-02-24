import mongoose from 'mongoose';

const registrationSchema = new mongoose.Schema({

    participant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    event: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },

    responses : [
        {
            label: String,
            value: mongoose.Schema.Types.Mixed 
        }
    ],

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