import { getFirestoreDb } from '@/lib/firebase-admin';
import { Product } from '@/types';
import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing';
import { comparePositions } from '@/lib/utils';

/**
 * Helper to map Firestore product document data to Product type
 */
function mapProductDoc(id: string, data: any): Product {
    return {
        id,
        name: data.name,
        description: data.description || null,
        price: data.price,
        imageUrl: data.imageUrl || null,
        position: typeof data.position === 'string' ? data.position : 'a0',
        categoryId: data.categoryId,
        tags: data.tags || [],
        allergens: data.allergens || [],
        available: data.available ?? true,
        active: data.active ?? true,
        presence: data.presence,
        variations: data.variations || [],
        calories: data.calories || 0,
        cookingTime: data.cookingTime || 0,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt instanceof Date ? data.createdAt : new Date()),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt instanceof Date ? data.updatedAt : new Date()),
    };
}

/**
 * Get all products for a category (ordered by position)
 */
export async function getProducts(
    restaurantId: string,
    menuId: string,
    categoryId: string
): Promise<Product[]> {
    const db = getFirestoreDb();

    try {
        const productsRef = db
            .collection('restaurants')
            .doc(restaurantId)
            .collection('menus')
            .doc(menuId)
            .collection('categories')
            .doc(categoryId)
            .collection('products');

        const snapshot = await productsRef.get();

        const products: Product[] = [];
        snapshot.forEach((doc) => {
            products.push(mapProductDoc(doc.id, doc.data()));
        });

        // Sort by position ascending (fractional index string comparison),
        // fallback to createdAt if position is identical or missing
        products.sort((a, b) => {
            const cmp = comparePositions(a.position, b.position);
            if (cmp !== 0) return cmp;
            const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
            const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
            return timeA - timeB;
        });

        return products;
    } catch (error) {
        console.error('Error fetching products from Firestore:', error);
        throw new Error('Failed to fetch products');
    }
}

/**
 * Get a single product by ID
 */
export async function getProductById(
    restaurantId: string,
    menuId: string,
    categoryId: string,
    productId: string
): Promise<Product | null> {
    const db = getFirestoreDb();

    try {
        const productDoc = await db
            .collection('restaurants')
            .doc(restaurantId)
            .collection('menus')
            .doc(menuId)
            .collection('categories')
            .doc(categoryId)
            .collection('products')
            .doc(productId)
            .get();

        if (!productDoc.exists) {
            return null;
        }

        const data = productDoc.data()!;
        return {
            id: productDoc.id,
            name: data.name,
            description: data.description || null,
            price: data.price,
            imageUrl: data.imageUrl || null,
            position: data.position,
            categoryId: data.categoryId,
            tags: data.tags || [],
            allergens: data.allergens || [],
            available: data.available ?? true,
            active: data.active ?? true,
            presence: data.presence,
            variations: data.variations || [],
            calories: data.calories || 0,
            cookingTime: data.cookingTime || 0,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
        };
    } catch (error) {
        console.error('Error fetching product from Firestore:', error);
        throw new Error('Failed to fetch product');
    }
}

/**
 * Get a single product by ID without knowing its category
 * Scans all categories in a menu to find the product
 */
export async function getProductWithoutCategory(
    restaurantId: string,
    menuId: string,
    productId: string
): Promise<Product | null> {
    const db = getFirestoreDb();

    try {
        // First get all categories for this menu
        const categoriesSnapshot = await db
            .collection('restaurants')
            .doc(restaurantId)
            .collection('menus')
            .doc(menuId)
            .collection('categories')
            .get();

        // Search each category for the product
        for (const categoryDoc of categoriesSnapshot.docs) {
            const product = await getProductById(restaurantId, menuId, categoryDoc.id, productId);
            if (product) {
                return product;
            }
        }

        return null;
    } catch (error) {
        console.error('Error finding product across categories:', error);
        throw new Error('Failed to fetch product without category');
    }
}

/**
 * Create a new product
 */
export async function createProduct(
    restaurantId: string,
    menuId: string,
    categoryId: string,
    data: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'position' | 'categoryId'>
): Promise<Product> {
    const db = getFirestoreDb();

    try {
        const productsRef = db
            .collection('restaurants')
            .doc(restaurantId)
            .collection('menus')
            .doc(menuId)
            .collection('categories')
            .doc(categoryId)
            .collection('products');

        // Get existing products to calculate next position safely
        const allProducts = await productsRef.get();

        let position: string;
        if (allProducts.empty) {
            position = generateKeyBetween(null, null); // First product
        } else {
            const validPositions = allProducts.docs
                .map((d) => d.data().position)
                .filter((pos): pos is string => typeof pos === 'string' && pos.length > 0)
                .sort();

            if (validPositions.length === 0) {
                position = generateKeyBetween(null, null);
            } else {
                const maxPosition = validPositions[validPositions.length - 1];
                position = generateKeyBetween(maxPosition, null);
            }
        }

        const now = new Date();
        const productData = {
            ...data,
            position,
            categoryId,
            createdAt: now,
            updatedAt: now,
        };

        const docRef = await productsRef.add(productData);

        return {
            id: docRef.id,
            ...productData,
        };
    } catch (error) {
        console.error('Error creating product in Firestore:', error);
        throw new Error('Failed to create product');
    }
}

/**
 * Update a product
 */
export async function updateProduct(
    restaurantId: string,
    menuId: string,
    categoryId: string,
    productId: string,
    data: Partial<Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'position' | 'categoryId'>>
): Promise<Product> {
    const db = getFirestoreDb();

    try {
        const productRef = db
            .collection('restaurants')
            .doc(restaurantId)
            .collection('menus')
            .doc(menuId)
            .collection('categories')
            .doc(categoryId)
            .collection('products')
            .doc(productId);

        await productRef.update({
            ...data,
            updatedAt: new Date(),
        });

        const updated = await productRef.get();
        return mapProductDoc(productId, updated.data()!);
    } catch (error) {
        console.error('Error updating product in Firestore:', error);
        throw new Error('Failed to update product');
    }
}

/**
 * Delete a product
 */
export async function deleteProduct(
    restaurantId: string,
    menuId: string,
    categoryId: string,
    productId: string
): Promise<void> {
    const db = getFirestoreDb();

    try {
        await db
            .collection('restaurants')
            .doc(restaurantId)
            .collection('menus')
            .doc(menuId)
            .collection('categories')
            .doc(categoryId)
            .collection('products')
            .doc(productId)
            .delete();
    } catch (error) {
        console.error('Error deleting product from Firestore:', error);
        throw new Error('Failed to delete product');
    }
}

/**
 * Reorder a product using fractional indexing with automatic rebalance fallback
 */
export async function reorderProduct(
    restaurantId: string,
    menuId: string,
    categoryId: string,
    productId: string,
    beforeId: string | null,
    afterId: string | null,
    orderedProductIds?: string[] | null
): Promise<Product> {
    const db = getFirestoreDb();

    try {
        const productsRef = db
            .collection('restaurants')
            .doc(restaurantId)
            .collection('menus')
            .doc(menuId)
            .collection('categories')
            .doc(categoryId)
            .collection('products');

        // Check if target product exists
        const targetDoc = await productsRef.doc(productId).get();
        if (!targetDoc.exists) {
            throw new Error(`Product not found: ${productId}`);
        }

        // Get before and after positions
        let beforePosition: string | null = null;
        let afterPosition: string | null = null;

        if (beforeId) {
            const beforeDoc = await productsRef.doc(beforeId).get();
            if (beforeDoc.exists) {
                const data = beforeDoc.data();
                if (data && typeof data.position === 'string') {
                    beforePosition = data.position;
                }
            }
        }

        if (afterId) {
            const afterDoc = await productsRef.doc(afterId).get();
            if (afterDoc.exists) {
                const data = afterDoc.data();
                if (data && typeof data.position === 'string') {
                    afterPosition = data.position;
                }
            }
        }

        let newPosition: string | null = null;

        // Try single fractional indexing key generation if conditions are strictly valid
        const canTryFractional =
            Boolean(beforePosition || afterPosition) &&
            (!beforePosition || !afterPosition || beforePosition < afterPosition) &&
            beforePosition !== afterPosition;

        if (canTryFractional) {
            try {
                newPosition = generateKeyBetween(beforePosition, afterPosition);
            } catch (err) {
                console.warn('generateKeyBetween failed, falling back to full rebalance:', err);
                newPosition = null;
            }
        } else if (!beforeId && !afterId) {
            newPosition = generateKeyBetween(null, null);
        }

        if (newPosition) {
            // Update single product
            const productRef = productsRef.doc(productId);
            await productRef.update({
                position: newPosition,
                updatedAt: new Date(),
            });

            const updated = await productRef.get();
            return mapProductDoc(productId, updated.data()!);
        }

        // --- FALLBACK REBALANCE ---
        // If before/after positions collide (e.g. both 'a0'), are inverted, or fractional indexing threw,
        // we rebalance all products in the category using clean keys.
        console.log(`Rebalancing positions for category ${categoryId} due to colliding or invalid positions`);

        const allDocsSnapshot = await productsRef.get();
        const docsMap = new Map<string, FirebaseFirestore.QueryDocumentSnapshot>();
        allDocsSnapshot.forEach(doc => docsMap.set(doc.id, doc));

        let finalOrderIds: string[] = [];

        if (orderedProductIds && orderedProductIds.length > 0) {
            const seen = new Set<string>();
            for (const id of orderedProductIds) {
                if (docsMap.has(id)) {
                    finalOrderIds.push(id);
                    seen.add(id);
                }
            }
            // Append any products in category that were not in orderedProductIds
            for (const id of docsMap.keys()) {
                if (!seen.has(id)) {
                    finalOrderIds.push(id);
                }
            }
        } else {
            // Deduce order from existing positions, placing productId between beforeId and afterId
            const otherDocs = allDocsSnapshot.docs.filter(d => d.id !== productId);
            otherDocs.sort((a, b) => {
                const cmp = comparePositions(a.data().position, b.data().position);
                if (cmp !== 0) return cmp;
                return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0);
            });

            const otherIds = otherDocs.map(d => d.id);
            if (beforeId && otherIds.includes(beforeId)) {
                const bIdx = otherIds.indexOf(beforeId);
                otherIds.splice(bIdx + 1, 0, productId);
                finalOrderIds = otherIds;
            } else if (afterId && otherIds.includes(afterId)) {
                const aIdx = otherIds.indexOf(afterId);
                otherIds.splice(aIdx, 0, productId);
                finalOrderIds = otherIds;
            } else {
                finalOrderIds = [productId, ...otherIds];
            }
        }

        const keys = generateNKeysBetween(null, null, finalOrderIds.length);
        const batch = db.batch();
        const now = new Date();

        for (let i = 0; i < finalOrderIds.length; i++) {
            const id = finalOrderIds[i];
            const docRef = productsRef.doc(id);
            batch.update(docRef, {
                position: keys[i],
                updatedAt: now,
            });
        }

        await batch.commit();

        const updatedDoc = await productsRef.doc(productId).get();
        return mapProductDoc(productId, updatedDoc.data()!);
    } catch (error) {
        console.error('Error reordering product in Firestore:', error);
        throw new Error('Failed to reorder product');
    }
}
