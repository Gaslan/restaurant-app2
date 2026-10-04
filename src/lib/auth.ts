import { betterAuth } from "better-auth";
import { firestoreAdapter } from "better-auth-firestore";
import { getFirestoreDb } from "./firebase-admin";

const db = getFirestoreDb();

export const auth = betterAuth({
    database: firestoreAdapter(db),
    baseURL: process.env.NEXT_PUBLIC_APP_URL,
    emailAndPassword: {
        enabled: true,
        autoSignIn: true // Automatically sign in after registration
    },
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
