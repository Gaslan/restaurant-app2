import { getFirestoreDb } from '../firebase-admin';
import type { Category } from '@/types';
import { FieldValue } from 'firebase-admin/firestore';
import { generateKeyBetween } from 'fractional-indexing';

/**
 * Firestore Category Service
 * Handles all category CRUD operations with Firestore
 * Categories are stored in: restaurants/{restaurantId}/menus/{menuId}/categories
 * Uses fractional indexing for efficient reordering
 */

/**
 * Get all categories for a menu (ordered by position)
 */
export async function getCategories(
    restaurantId: string,
    menuId: string
): Promise<Category[]> {
    const db = getFirestoreDb();

    try {
        const categoriesRef = db
            .collection('restaurants')
            .doc(restaurantId)
            .collection('menus')
            .doc(menuId)
            .collection('categories');

        const snapshot = await categoriesRef
            .orderBy('position', 'asc')
            .get();

        const categories: Category[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            categories.push({
                id: doc.id,
                name: data.name,
                description: data.description || null,
                imageUrl: data.imageUrl || null,
                position: data.position,
                menuId: data.menuId,
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date(),
            });
        });

        return categories;
    } catch (error) {
        console.error('Error fetching categories from Firestore:', error);
        throw new Error('Failed to fetch categories');
    }
}

/**
 * Get a single category by ID
 */
export async function getCategoryById(
    restaurantId: string,
    menuId: string,
    categoryId: string
): Promise<Category | null> {
    const db = getFirestoreDb();

    try {
        const categoryRef = db
            .collection('restaurants')
            .doc(restaurantId)
            .collection('menus')
            .doc(menuId)
            .collection('categories')
            .doc(categoryId);

        const doc = await categoryRef.get();

        if (!doc.exists) {
            return null;
        }

        const data = doc.data()!;
        return {
            id: doc.id,
            name: data.name,
            description: data.description || null,
            imageUrl: data.imageUrl || null,
            position: data.position,
            menuId: data.menuId,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
        };
    } catch (error) {
        console.error('Error fetching category from Firestore:', error);
        throw new Error('Failed to fetch category');
    }
}

/**
 * Create a new category with auto-calculated position
 */
export async function createCategory(
    restaurantId: string,
    menuId: string,
    data: { name: string; description?: string | null; imageUrl?: string | null }
): Promise<Category> {
    const db = getFirestoreDb();

    try {
        const categoriesRef = db
            .collection('restaurants')
            .doc(restaurantId)
            .collection('menus')
            .doc(menuId)
            .collection('categories');

        // Get the last category to calculate new position
        const snapshot = await categoriesRef
            .orderBy('position', 'desc')
            .limit(1)
            .get();

        // Generate position for new category (append to end)
        const lastPosition = snapshot.empty ? null : snapshot.docs[0].data().position;
        const position = generateKeyBetween(lastPosition, null);

        const now = FieldValue.serverTimestamp();
        const categoryData = {
            name: data.name,
            description: data.description || null,
            imageUrl: data.imageUrl || null,
            position,
            menuId,
            createdAt: now,
            updatedAt: now,
        };

        const docRef = await categoriesRef.add(categoryData);

        // Fetch the created document to return with server timestamp
        const createdDoc = await docRef.get();
        const createdData = createdDoc.data()!;

        return {
            id: docRef.id,
            name: createdData.name,
            description: createdData.description,
            imageUrl: createdData.imageUrl || null,
            position: createdData.position,
            menuId: createdData.menuId,
            createdAt: createdData.createdAt?.toDate() || new Date(),
            updatedAt: createdData.updatedAt?.toDate() || new Date(),
        };
    } catch (error) {
        console.error('Error creating category in Firestore:', error);
        throw new Error('Failed to create category');
    }
}

/**
 * Update an existing category
 */
export async function updateCategory(
    restaurantId: string,
    menuId: string,
    categoryId: string,
    data: Partial<{ name: string; description: string | null; imageUrl: string | null; position: string }>
): Promise<Category> {
    const db = getFirestoreDb();

    try {
        const categoryRef = db
            .collection('restaurants')
            .doc(restaurantId)
            .collection('menus')
            .doc(menuId)
            .collection('categories')
            .doc(categoryId);

        // Check if category exists
        const doc = await categoryRef.get();
        if (!doc.exists) {
            throw new Error('Category not found');
        }

        const updateData: any = {
            ...data,
            updatedAt: FieldValue.serverTimestamp(),
        };

        await categoryRef.update(updateData);

        // Fetch updated document
        const updatedDoc = await categoryRef.get();
        const updatedData = updatedDoc.data()!;

        return {
            id: categoryId,
            name: updatedData.name,
            description: updatedData.description || null,
            imageUrl: updatedData.imageUrl || null,
            position: updatedData.position,
            menuId: updatedData.menuId,
            createdAt: updatedData.createdAt?.toDate() || new Date(),
            updatedAt: updatedData.updatedAt?.toDate() || new Date(),
        };
    } catch (error) {
        console.error('Error updating category in Firestore:', error);
        throw new Error('Failed to update category');
    }
}

/**
 * Reorder a category (for drag-and-drop)
 * Calculates new position between before and after categories
 */
export async function reorderCategory(
    restaurantId: string,
    menuId: string,
    categoryId: string,
    beforeId: string | null,
    afterId: string | null
): Promise<Category> {
    const db = getFirestoreDb();

    try {
        const categoriesRef = db
            .collection('restaurants')
            .doc(restaurantId)
            .collection('menus')
            .doc(menuId)
            .collection('categories');

        // Get before and after positions
        let beforePosition: string | null = null;
        let afterPosition: string | null = null;

        if (beforeId) {
            const beforeDoc = await categoriesRef.doc(beforeId).get();
            if (beforeDoc.exists) {
                beforePosition = beforeDoc.data()!.position;
            }
        }

        if (afterId) {
            const afterDoc = await categoriesRef.doc(afterId).get();
            if (afterDoc.exists) {
                afterPosition = afterDoc.data()!.position;
            }
        }

        // Generate new position between before and after
        const newPosition = generateKeyBetween(beforePosition, afterPosition);

        // Update the category position
        return await updateCategory(restaurantId, menuId, categoryId, {
            position: newPosition,
        });
    } catch (error) {
        console.error('Error reordering category in Firestore:', error);
        throw new Error('Failed to reorder category');
    }
}

/**
 * Delete a category
 */
export async function deleteCategory(
    restaurantId: string,
    menuId: string,
    categoryId: string
): Promise<void> {
    const db = getFirestoreDb();

    try {
        const categoryRef = db
            .collection('restaurants')
            .doc(restaurantId)
            .collection('menus')
            .doc(menuId)
            .collection('categories')
            .doc(categoryId);

        // Check if category exists
        const doc = await categoryRef.get();
        if (!doc.exists) {
            throw new Error('Category not found');
        }

        await categoryRef.delete();
    } catch (error) {
        console.error('Error deleting category from Firestore:', error);
        throw new Error('Failed to delete category');
    }
}
