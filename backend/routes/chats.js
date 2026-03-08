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
router.get('/my-thread', authMiddleware, asyncHandler(async (req, res) => {
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
router.post('/message', authMiddleware, asyncHandler(async (req, res) => {
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
router.get('/admin/inbox', authMiddleware, staffMiddleware, asyncHandler(async (req, res) => {
    const threads = await ChatThread.find({ status: 'open', type: 'support' })
        .populate('user', 'name email')
        .sort({ lastMessageAt: -1 });

    res.json({ status: 'success', data: { threads } });
}));

// @route   GET /api/chats/:threadId/messages
// @desc    Get messages for a specific thread
// @access  Private
router.get('/:threadId/messages', authMiddleware, asyncHandler(async (req, res) => {
    const messages = await ChatMessage.find({ thread: req.params.threadId }).sort({ createdAt: 1 });
    res.json({ status: 'success', data: { messages } });
}));

// @route   POST /api/chats/ai
// @desc    Chat with Gemini AI Assistant
// @access  Private
router.post('/ai', authMiddleware, asyncHandler(async (req, res) => {
    const { content, threadId } = req.body;

    let thread;
    if (threadId) {
        thread = await ChatThread.findById(threadId);
    } else {
        thread = await ChatThread.create({ 
            user: req.user._id, 
            type: 'ai',
            status: 'open' 
        });
    }

    // 1. Save user message
    const userMsg = await ChatMessage.create({
        thread: thread._id,
        sender: req.user._id,
        senderType: 'user',
        content
    });

    // 2. Get history (last 10 messages)
    const history = await ChatMessage.find({ thread: thread._id })
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
                threadId: thread._id
            } 
        });
    } catch (error) {
        console.error("AI Thread Error:", error);
        res.status(500).json({ 
            status: 'error', 
            message: 'AI Assistant is currently unavailable. Please ensure OPENROUTER_API_KEY is configured.' 
        });
    }
}));

export default router;
