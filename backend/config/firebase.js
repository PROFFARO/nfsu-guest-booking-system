import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

let firebaseAdmin;

try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

        firebaseAdmin = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });

        console.log('[FIREBASE] Admin SDK initialized successfully');
    } else {
        console.warn('[FIREBASE] FIREBASE_SERVICE_ACCOUNT_JSON not found in environment variables. Firebase features will be disabled.');
    }
} catch (error) {
    console.error('[FIREBASE] Initialization error:', error.message);
}

export default firebaseAdmin;
