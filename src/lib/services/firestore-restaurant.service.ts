import { getFirestoreDb } from '../firebase-admin';
import type { Restaurant, QrSettings, QrMenuSettings } from '@/types';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Firestore Restaurant Service
 * Handles restaurant settings and details
 */

const COLLECTION_NAME = 'restaurants';

/**
 * Get restaurant details by ID
 */
export async function getRestaurant(id: string): Promise<Restaurant | null> {
    const db = getFirestoreDb();

    try {
        const doc = await db
            .collection(COLLECTION_NAME)
            .doc(id)
            .collection('settings')
            .doc('restaurant')
            .get();

        if (!doc.exists) {
            return null;
        }

        const data = doc.data()!;

        return {
            id: id, // Correctly use the restaurant ID
            name: data.name,
            logoUrl: data.logoUrl || null,
            description: data.description || '',
            currency: data.currency || 'TRY',
            phone: data.phone,
            email: data.email,
            address: data.address,
            socialMedia: data.socialMedia || [],
            openingHours: data.openingHours || [],
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
        };
    } catch (error) {
        console.error('Error fetching restaurant:', error);
        throw new Error('Failed to fetch restaurant settings');
    }
}

/**
 * Update restaurant settings
 */
export async function updateRestaurant(
    id: string,
    data: Partial<Pick<Restaurant, 'name' | 'description' | 'phone' | 'email' | 'address' | 'socialMedia' | 'openingHours' | 'currency'>>
): Promise<Restaurant> {
    const db = getFirestoreDb();
    const docRef = db
        .collection(COLLECTION_NAME)
        .doc(id)
        .collection('settings')
        .doc('restaurant');

    try {
        const updateData = {
            ...data,
            updatedAt: FieldValue.serverTimestamp(),
        };

        // Remove undefined fields to avoid Firestore errors
        Object.keys(updateData).forEach(key =>
            (updateData as any)[key] === undefined && delete (updateData as any)[key]
        );

        await docRef.set(updateData, { merge: true });

        // Fetch updated data
        const updatedDoc = await docRef.get();
        const updatedData = updatedDoc.data()!;

        return {
            id: id, // Correctly use the restaurant ID
            name: updatedData.name,
            logoUrl: updatedData.logoUrl || null,
            description: updatedData.description || '',
            currency: updatedData.currency || 'TRY',
            phone: updatedData.phone,
            email: updatedData.email,
            address: updatedData.address,
            socialMedia: updatedData.socialMedia || [],
            openingHours: updatedData.openingHours || [],
            createdAt: updatedData.createdAt?.toDate() || new Date(),
            updatedAt: updatedData.updatedAt?.toDate() || new Date(),
        };
    } catch (error) {
        console.error('Error updating restaurant:', error);
        throw new Error('Failed to update restaurant settings');
    }
}

/**
 * Get restaurant QR settings
 */
export async function getQrSettings(id: string): Promise<QrSettings | null> {
    const db = getFirestoreDb();

    try {
        const doc = await db
            .collection(COLLECTION_NAME)
            .doc(id)
            .collection('settings')
            .doc('qr-code')
            .get();

        if (!doc.exists) {
            return null;
        }

        const data = doc.data()!;

        return {
            backgroundColor: data.backgroundColor || '#ffffff',
            foregroundColor: data.foregroundColor || '#000000',
            text: data.text || '',
            textPosition: data.textPosition || 'bottom',
        };
    } catch (error) {
        console.error('Error fetching QR settings:', error);
        throw new Error('Failed to fetch QR settings');
    }
}

/**
 * Update restaurant QR settings
 */
export async function updateQrSettings(id: string, data: Partial<QrSettings>): Promise<QrSettings> {
    const db = getFirestoreDb();
    const docRef = db
        .collection(COLLECTION_NAME)
        .doc(id)
        .collection('settings')
        .doc('qr-code');

    try {
        const updateData = {
            ...data,
            updatedAt: FieldValue.serverTimestamp(),
        };

        // Remove undefined fields
        Object.keys(updateData).forEach(key =>
            (updateData as any)[key] === undefined && delete (updateData as any)[key]
        );

        await docRef.set(updateData, { merge: true });

        const updatedDoc = await docRef.get();
        const updatedData = updatedDoc.data()!;

        return {
            backgroundColor: updatedData.backgroundColor || '#ffffff',
            foregroundColor: updatedData.foregroundColor || '#000000',
            text: updatedData.text || '',
            textPosition: updatedData.textPosition || 'bottom',
        };
    } catch (error) {
        console.error('Error updating QR settings:', error);
        throw new Error('Failed to update QR settings');
    }
}

/**
 * Get restaurant QR Menu settings
 */
export async function getQrMenuSettings(id: string): Promise<QrMenuSettings | null> {
    const db = getFirestoreDb();

    try {
        const doc = await db
            .collection(COLLECTION_NAME)
            .doc(id)
            .collection('settings')
            .doc('qr-menu')
            .get();

        if (!doc.exists) {
            return null;
        }

        const data = doc.data()!;

        // Ensure defaults structure
        return {
            landing: {
                backgroundColor: data.landing?.backgroundColor || '#ffffff',
                textColor: data.landing?.textColor || '#000000',
                fontFamily: data.landing?.fontFamily || 'Inter',
            },
            menu: data.menu || {},
            product: data.product || {},
        };
    } catch (error) {
        console.error('Error fetching QR Menu settings:', error);
        throw new Error('Failed to fetch QR Menu settings');
    }
}

/**
 * Update restaurant QR Menu settings
 */
export async function updateQrMenuSettings(id: string, data: Partial<QrMenuSettings>): Promise<QrMenuSettings> {
    const db = getFirestoreDb();
    const docRef = db
        .collection(COLLECTION_NAME)
        .doc(id)
        .collection('settings')
        .doc('qr-menu');

    try {
        const updateData = {
            ...data,
            updatedAt: FieldValue.serverTimestamp(),
        };

        // Remove undefined fields recursively if needed, but for now simple spread is okay for 1 level deep objects.
        // Actually, we should probably do a deep merge or just set. set with merge true is fine.

        await docRef.set(updateData, { merge: true });

        const updatedDoc = await docRef.get();
        const updatedData = updatedDoc.data()!;

        return {
            landing: {
                backgroundColor: updatedData.landing?.backgroundColor || '#ffffff',
                textColor: updatedData.landing?.textColor || '#000000',
                fontFamily: updatedData.landing?.fontFamily || 'Inter',
            },
            menu: updatedData.menu || {},
            product: updatedData.product || {},
        };
    } catch (error) {
        console.error('Error updating QR Menu settings:', error);
        throw new Error('Failed to update QR Menu settings');
    }
}
