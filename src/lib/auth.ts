import { betterAuth } from "better-auth";
import { firestoreAdapter } from "better-auth-firestore";
import { getFirestoreDb } from "./firebase-admin";

const db = getFirestoreDb();

const baseAdapterFactory = firestoreAdapter(db);

// Fallback adapter wrapper that handles Firestore missing composite index (Code 9) gracefully
const safeFirestoreAdapter = (options: any) => {
    const dbAdapter = baseAdapterFactory(options);
    const originalFindMany = dbAdapter.findMany;

    (dbAdapter as any).findMany = async (args: any) => {
        try {
            return await originalFindMany(args);
        } catch (err: any) {
            if (err?.code === 9 || err?.message?.includes('requires an index')) {
                const { sortBy, ...restArgs } = args;
                const results = await originalFindMany(restArgs);
                if (sortBy?.field && Array.isArray(results)) {
                    results.sort((a: any, b: any) => {
                        const aVal = a[sortBy.field];
                        const bVal = b[sortBy.field];
                        const dir = sortBy.direction === 'desc' ? -1 : 1;
                        if (aVal < bVal) return -1 * dir;
                        if (aVal > bVal) return 1 * dir;
                        return 0;
                    });
                }
                return results;
            }
            throw err;
        }
    };

    return dbAdapter;
};

const googleClientId = process.env.GOOGLE_AUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_AUTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;

export const auth = betterAuth({
    database: safeFirestoreAdapter as any,
    baseURL: process.env.BETTER_AUTH_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    emailAndPassword: {
        enabled: true,
        autoSignIn: true // Automatically sign in after registration
    },
    ...(googleClientId && googleClientSecret ? {
        socialProviders: {
            google: {
                clientId: googleClientId,
                clientSecret: googleClientSecret,
            }
        }
    } : {}),
    user: {
        additionalFields: {
            authority: {
                type: "string[]",
                required: false,
                defaultValue: ["admin"]
            },
            restaurantId: {
                type: "string",
                required: false,
            }
        }
    }
});
