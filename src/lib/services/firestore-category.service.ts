import { getFirestoreDb } from '../firebase-admin';
import type { Category } from '@/types';
import { FieldValue } from 'firebase-admin/firestore';
import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing';
import { comparePositions } from '@/lib/utils';

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

        const snapshot = await categoriesRef.get();

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
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
            });
        });

        categories.sort((a, b) => {
            const cmp = comparePositions(a.position, b.position);
            if (cmp !== 0) return cmp;
            const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
            const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
            return timeA - timeB;
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
    data: {
        name: string;
        description?: string | null;
        imageUrl?: string | null;
        afterCategoryId?: string | null;
        position?: string | null;
    }
): Promise<Category> {
    const db = getFirestoreDb();

    try {
        const categoriesRef = db
            .collection('restaurants')
            .doc(restaurantId)
            .collection('menus')
            .doc(menuId)
            .collection('categories');

        let position: string;

        if (data.position) {
            position = data.position;
        } else if (data.afterCategoryId) {
            // Fetch all categories for this menu to find target category and the one following it
            const allCategoriesSnapshot = await categoriesRef.get();
            const allCats = allCategoriesSnapshot.docs.map((d) => ({
                id: d.id,
                position: (d.data().position as string) || '',
            }));
            allCats.sort((a, b) => comparePositions(a.position, b.position));

            const targetIdx = allCats.findIndex((c) => c.id === data.afterCategoryId);
            if (targetIdx !== -1) {
                const prevPos = allCats[targetIdx].position;
                const nextPos =
                    targetIdx < allCats.length - 1 ? allCats[targetIdx + 1].position : null;
                position = generateKeyBetween(prevPos, nextPos);
            } else {
                const lastPos = allCats.length > 0 ? allCats[allCats.length - 1].position : null;
                position = generateKeyBetween(lastPos, null);
            }
        } else {
            // Get the last category to calculate new position
            const snapshot = await categoriesRef
                .orderBy('position', 'desc')
                .limit(1)
                .get();

            // Generate position for new category (append to end)
            const lastPosition = snapshot.empty ? null : snapshot.docs[0].data().position;
            position = generateKeyBetween(lastPosition, null);
        }

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
 * Calculates new position between before and after categories with rebalance fallback
 */
export async function reorderCategory(
    restaurantId: string,
    menuId: string,
    categoryId: string,
    beforeId: string | null,
    afterId: string | null,
    orderedCategoryIds?: string[] | null
): Promise<Category> {
    const db = getFirestoreDb();

    try {
        const categoriesRef = db
            .collection('restaurants')
            .doc(restaurantId)
            .collection('menus')
            .doc(menuId)
            .collection('categories');

        // Check if category exists
        const categoryDoc = await categoriesRef.doc(categoryId).get();
        if (!categoryDoc.exists) {
            throw new Error('Category not found');
        }

        // Get before and after positions
        let beforePosition: string | null = null;
        let afterPosition: string | null = null;

        if (beforeId) {
            const beforeDoc = await categoriesRef.doc(beforeId).get();
            if (beforeDoc.exists) {
                const data = beforeDoc.data();
                if (data && typeof data.position === 'string') {
                    beforePosition = data.position;
                }
            }
        }

        if (afterId) {
            const afterDoc = await categoriesRef.doc(afterId).get();
            if (afterDoc.exists) {
                const data = afterDoc.data();
                if (data && typeof data.position === 'string') {
                    afterPosition = data.position;
                }
            }
        }

        let newPosition: string | null = null;

        const canTryFractional =
            Boolean(beforePosition || afterPosition) &&
            (!beforePosition || !afterPosition || beforePosition < afterPosition) &&
            beforePosition !== afterPosition;

        if (canTryFractional) {
            try {
                newPosition = generateKeyBetween(beforePosition, afterPosition);
            } catch (err) {
                console.warn('generateKeyBetween failed for category, falling back to full rebalance:', err);
                newPosition = null;
            }
        } else if (!beforeId && !afterId) {
            newPosition = generateKeyBetween(null, null);
        }

        if (newPosition) {
            return await updateCategory(restaurantId, menuId, categoryId, {
                position: newPosition,
            });
        }

        // Rebalance categories
        console.log(`Rebalancing positions for categories in menu ${menuId}`);
        const allDocsSnapshot = await categoriesRef.get();
        const docsMap = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
        allDocsSnapshot.forEach(doc => docsMap.set(doc.id, doc));

        let finalOrderIds: string[] = [];

        if (orderedCategoryIds && orderedCategoryIds.length > 0) {
            const seen = new Set<string>();
            for (const id of orderedCategoryIds) {
                if (docsMap.has(id)) {
                    finalOrderIds.push(id);
                    seen.add(id);
                }
            }
            for (const id of docsMap.keys()) {
                if (!seen.has(id)) {
                    finalOrderIds.push(id);
                }
            }
        } else {
            const otherDocs = allDocsSnapshot.docs.filter(d => d.id !== categoryId);
            otherDocs.sort((a, b) => {
                const cmp = comparePositions(a.data().position, b.data().position);
                if (cmp !== 0) return cmp;
                return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
            });

            const otherIds = otherDocs.map(d => d.id);
            if (beforeId && otherIds.includes(beforeId)) {
                const bIdx = otherIds.indexOf(beforeId);
                otherIds.splice(bIdx + 1, 0, categoryId);
                finalOrderIds = otherIds;
            } else if (afterId && otherIds.includes(afterId)) {
                const aIdx = otherIds.indexOf(afterId);
                otherIds.splice(aIdx, 0, categoryId);
                finalOrderIds = otherIds;
            } else {
                finalOrderIds = [categoryId, ...otherIds];
            }
        }

        const keys = generateNKeysBetween(null, null, finalOrderIds.length);
        const batch = db.batch();
        const now = new Date();

        for (let i = 0; i < finalOrderIds.length; i++) {
            const id = finalOrderIds[i];
            const docRef = categoriesRef.doc(id);
            batch.update(docRef, {
                position: keys[i],
                updatedAt: now,
            });
        }

        await batch.commit();

        const updated = await categoriesRef.doc(categoryId).get();
        const updatedData = updated.data()!;
        return {
            id: categoryId,
            name: updatedData.name,
            description: updatedData.description || null,
            imageUrl: updatedData.imageUrl || null,
            position: updatedData.position,
            menuId: updatedData.menuId,
            createdAt: updatedData.createdAt?.toDate ? updatedData.createdAt.toDate() : new Date(),
            updatedAt: updatedData.updatedAt?.toDate ? updatedData.updatedAt.toDate() : new Date(),
        };
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
