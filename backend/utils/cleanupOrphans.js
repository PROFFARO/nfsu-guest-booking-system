import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly resolve the backend directory where .env is located
const envPath = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: envPath });

import AuditLog from '../models/AuditLog.js';
import ChatThread from '../models/ChatThread.js';
import User from '../models/User.js';

async function cleanUpOrphans() {
    try {
        console.log('Connecting to MongoDB...', process.env.MONGODB_URI);
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        // 1. Get all valid User IDs
        const users = await User.find({}, '_id');
        const validUserIds = users.map(u => u._id.toString());
        console.log(`Found ${validUserIds.length} valid users.`);

        // 2. Find and delete AuditLogs where user doesn't exist
        const orphanedLogs = await AuditLog.find({ user: { $nin: validUserIds } });
        console.log(`Found ${orphanedLogs.length} orphaned AuditLogs.`);
        if (orphanedLogs.length > 0) {
            const deleteLogsRes = await AuditLog.deleteMany({ user: { $nin: validUserIds } });
            console.log(`Deleted ${deleteLogsRes.deletedCount} orphaned AuditLogs.`);
        }

        // 3. Find and delete ChatThreads where user doesn't exist
        const orphanedThreads = await ChatThread.find({ user: { $nin: validUserIds } });
        console.log(`Found ${orphanedThreads.length} orphaned ChatThreads.`);
        if (orphanedThreads.length > 0) {
            const deleteThreadsRes = await ChatThread.deleteMany({ user: { $nin: validUserIds } });
            console.log(`Deleted ${deleteThreadsRes.deletedCount} orphaned ChatThreads.`);
        }

        console.log('Cleanup complete.');
        process.exit(0);
    } catch (err) {
        console.error('Error during cleanup:', err);
        process.exit(1);
    }
}

cleanUpOrphans();
