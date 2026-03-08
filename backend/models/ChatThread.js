import mongoose from 'mongoose';

const chatThreadSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        default: 'New Conversation'
    },
    status: {
        type: String,
        enum: ['open', 'closed'],
        default: 'open'
    },
    type: {
        type: String,
        enum: ['support', 'ai'],
        default: 'support'
    },
    lastMessageAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

const ChatThread = mongoose.model('ChatThread', chatThreadSchema);
export default ChatThread;
