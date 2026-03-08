import express from 'express';
import ChatThread from '../models/ChatThread.js';
import ChatMessage from '../models/ChatMessage.js';
import { authMiddleware, staffMiddleware } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { processAIChat } from '../utils/aiAgent.js';

const router = express.Router();

// @route   GET /api/chats/my-thread
// @desc    Get or create current user's active support thread
// @access  Private
router.get('/my-thread', asyncHandler(async (req, res) => {
    let thread = await ChatThread.findOne({ 
        user: req.user._id, 
        status: 'open',
        type: 'support'
    });

    if (!thread) {
        thread = await ChatThread.create({ user: req.user._id, type: 'support' });
    }

    const messages = await ChatMessage.find({ thread: thread._id }).sort({ createdAt: 1 });

    res.json({ status: 'success', data: { thread, messages } });
}));

// @route   POST /api/chats/message
// @desc    Send a message in a thread
// @access  Private
router.post('/message', asyncHandler(async (req, res) => {
    const { threadId, content } = req.body;

    const thread = await ChatThread.findById(threadId);
    if (!thread) {
        return res.status(404).json({ status: 'error', message: 'Chat thread not found' });
    }

    // Authorization: User owns thread OR is staff
    if (thread.user.toString() !== req.user._id.toString() && req.user.role === 'user') {
        return res.status(403).json({ status: 'error', message: 'Not authorized' });
    }

    const message = await ChatMessage.create({
        thread: threadId,
        sender: req.user._id,
        senderType: req.user.role === 'user' ? 'user' : 'staff',
        content
    });

    thread.lastMessageAt = Date.now();
    await thread.save();

    res.status(201).json({ status: 'success', data: { message } });
}));

// @route   GET /api/chats/admin/inbox
// @desc    Get all open support threads for staff
// @access  Private (Staff/Admin)
router.get('/admin/inbox', staffMiddleware, asyncHandler(async (req, res) => {
    const threads = await ChatThread.find({ status: 'open', type: 'support' })
        .populate('user', 'name email')
        .sort({ lastMessageAt: -1 });

    res.json({ status: 'success', data: { threads } });
}));

// @route   GET /api/chats/:threadId/messages
// @desc    Get messages for a specific thread
// @access  Private
router.get('/:threadId/messages', asyncHandler(async (req, res) => {
    const messages = await ChatMessage.find({ thread: req.params.threadId }).sort({ createdAt: 1 });
    res.json({ status: 'success', data: { messages } });
}));

// @route   GET /api/chats/ai/threads
// @desc    Get all AI chat threads for the logged-in user
// @access  Private
router.get('/ai/threads', asyncHandler(async (req, res) => {
    const threads = await ChatThread.find({ 
        user: req.user._id, 
        type: 'ai' 
    }).sort({ lastMessageAt: -1 });

    res.json({ status: 'success', data: { threads } });
}));

// @route   POST /api/chats/ai/threads
// @desc    Create a new empty AI support thread
// @access  Private
router.post('/ai/threads', asyncHandler(async (req, res) => {
    const thread = await ChatThread.create({ 
        user: req.user._id, 
        type: 'ai',
        title: 'New Chat'
    });
    res.status(201).json({ status: 'success', data: { thread } });
}));

// @route   DELETE /api/chats/ai/threads/:id
// @desc    Delete an AI chat thread and its messages
// @access  Private
router.delete('/ai/threads/:id', asyncHandler(async (req, res) => {
    const thread = await ChatThread.findById(req.params.id);
    
    if (!thread) {
        return res.status(404).json({ status: 'error', message: 'Thread not found' });
    }

    if (thread.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ status: 'error', message: 'Not authorized to delete this thread' });
    }

    await ChatMessage.deleteMany({ thread: thread._id });
    await thread.deleteOne();

    res.json({ status: 'success', message: 'Thread deleted successfully' });
}));

// @route   POST /api/chats/ai
// @desc    Chat with Campus AI Assistant
// @access  Private
router.post('/ai', asyncHandler(async (req, res) => {
    const { content, threadId } = req.body;

    let thread;
    if (threadId) {
        thread = await ChatThread.findById(threadId);
        if (!thread || thread.user.toString() !== req.user._id.toString()) {
            return res.status(404).json({ status: 'error', message: 'Chat thread not found' });
        }
    } else {
        // Generate a short title from the first message
        const title = content.length > 30 ? content.substring(0, 27) + "..." : content;
        thread = await ChatThread.create({ 
            user: req.user._id, 
            type: 'ai',
            status: 'open',
            title
        });
    }

    // 1. Save user message
    const userMsg = await ChatMessage.create({
        thread: thread._id,
        sender: req.user._id,
        senderType: 'user',
        content
    });

    // Update last message timestamp
    thread.lastMessageAt = Date.now();
    
    // If it was the default title, update it with the first message content
    if (thread.title === 'New Chat' || thread.title === 'New Conversation') {
        const newTitle = content.length > 30 ? content.substring(0, 27) + "..." : content;
        thread.title = newTitle;
    }
    await thread.save();

    // 2. Get history (last 10 messages, excluding current one)
    const history = await ChatMessage.find({ 
        thread: thread._id,
        _id: { $ne: userMsg._id }
    })
        .sort({ createdAt: -1 })
        .limit(10);
    
    // 3. Process with AI
    try {
        const aiResponse = await processAIChat(req.user._id, content, history.reverse());

        // 4. Save AI response
        const aiMsg = await ChatMessage.create({
            thread: thread._id,
            senderType: 'ai',
            content: aiResponse.text,
            metadata: {
                action: aiResponse.action,
                result: aiResponse.result
            }
        });

        res.json({ 
            status: 'success', 
            data: { 
                userMessage: userMsg, 
                aiMessage: aiMsg,
                threadId: thread._id,
                threadTitle: thread.title
            } 
        });
    } catch (error) {
        console.error("AI Thread Error:", error);
        res.status(500).json({ 
            status: 'error', 
            message: error.message || 'AI Assistant is currently unavailable.' 
        });
    }
}));

export default router;
