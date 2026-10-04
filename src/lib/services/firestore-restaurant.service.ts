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

        const rootDoc = await db.collection(COLLECTION_NAME).doc(id).get();
        const rootData = rootDoc.exists ? rootDoc.data()! : {};

        if (!doc.exists && !rootDoc.exists) {
            return null;
        }

        const data = doc.exists ? doc.data()! : {};

        return {
            id: id,
            name: data.name ?? rootData.name ?? '',
            logoUrl: data.logoUrl ?? rootData.logoUrl ?? null,
            description: data.description ?? rootData.description ?? '',
            currency: data.currency ?? rootData.currency ?? 'TRY',
            phone: data.phone ?? rootData.phone,
            email: data.email ?? rootData.email,
            address: data.address ?? rootData.address,
            socialMedia: data.socialMedia ?? rootData.socialMedia ?? [],
            openingHours: data.openingHours ?? rootData.openingHours ?? [],
            appearance: data.appearance ?? rootData.appearance ?? { imagePosition: 'right' },
            createdAt: data.createdAt?.toDate?.() || rootData.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || rootData.updatedAt?.toDate?.() || new Date(),
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
    data: Partial<Pick<Restaurant, 'name' | 'description' | 'phone' | 'email' | 'address' | 'socialMedia' | 'openingHours' | 'currency' | 'appearance'>>
): Promise<Restaurant> {
    const db = getFirestoreDb();
    const docRef = db
        .collection(COLLECTION_NAME)
        .doc(id)
        .collection('settings')
        .doc('restaurant');
    const rootDocRef = db.collection(COLLECTION_NAME).doc(id);

    try {
        const updateData: any = {
            ...data,
            updatedAt: FieldValue.serverTimestamp(),
        };

        // Remove undefined fields to avoid Firestore errors
        Object.keys(updateData).forEach(key =>
            updateData[key] === undefined && delete updateData[key]
        );

        // Update settings/restaurant sub-collection document
        await docRef.set(updateData, { merge: true });

        // Also merge into root restaurant document to keep them in sync
        await rootDocRef.set(updateData, { merge: true });

        const updated = await getRestaurant(id);
        if (!updated) {
            throw new Error('Failed to retrieve updated restaurant');
        }
        return updated;
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
