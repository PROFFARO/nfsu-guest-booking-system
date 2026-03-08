import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
    thread: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChatThread',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false // Null if sent by AI
    },
    senderType: {
        type: String,
        enum: ['user', 'staff', 'ai'],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['text', 'system', 'action'],
        default: 'text'
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed, // For storing AI action results, booking hints, etc.
        default: {}
    }
}, {
    timestamps: true
});

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);
export default ChatMessage;
