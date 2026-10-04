import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage as getAdminStorage } from 'firebase-admin/storage';

let app: App | undefined;
let firestore: Firestore | undefined;

/**
 * Initialize Firebase Admin SDK
 * Singleton pattern - only initializes once
 */
export function initializeFirebaseAdmin(): App {
    if (app) {
        return app;
    }

    // Check if already initialized
    const existingApps = getApps();
    if (existingApps.length > 0) {
        app = existingApps[0];
        return app;
    }

    // Validate required environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

    if (!projectId || !clientEmail || !privateKey || !storageBucket) {
        throw new Error(
            'Firebase Admin credentials are missing. Please check your environment variables:\n' +
            '- FIREBASE_PROJECT_ID\n' +
            '- FIREBASE_CLIENT_EMAIL\n' +
            '- FIREBASE_PRIVATE_KEY\n' +
            '- FIREBASE_STORAGE_BUCKET'
        );
    }

    try {
        // Initialize Firebase Admin
        app = initializeApp({
            credential: cert({
                projectId,
                clientEmail,
                // Replace escaped newlines with actual newlines
                privateKey: privateKey.replace(/\\n/g, '\n'),
            }),
            storageBucket,
        });

        console.log('✅ Firebase Admin initialized successfully');
        return app;
    } catch (error) {
        console.error('❌ Failed to initialize Firebase Admin:', error);
        throw error;
    }
}

/**
 * Get Firestore instance
 * Initializes Firebase Admin if not already initialized
 */
export function getFirestoreDb(): Firestore {
    if (!firestore) {
        initializeFirebaseAdmin();
        firestore = getFirestore();
        try {
            firestore.settings({ ignoreUndefinedProperties: true });
        } catch (error) {
            console.warn('Firestore settings already set or locked:', error instanceof Error ? error.message : error);
        }
    }
    return firestore;
}

/**
 * Get Storage instance
 * Initializes Firebase Admin if not already initialized
 */
export function getStorage() {
    if (!app) {
        initializeFirebaseAdmin();
    }
    return getAdminStorage(app);
}

/**
 * Check if Firestore is enabled and configured
 */
export function isFirestoreEnabled(): boolean {
    const hasCredentials = !!(
        process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY
    );

    if (!hasCredentials) {
        console.error(
            '❌ Firebase credentials are missing. ' +
            'Please check your .env.local file. ' +
            'Firestore is now required.'
        );
        return false;
    }

    return true;
}
