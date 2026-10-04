import { getFirestoreDb } from '@/lib/firebase-admin';
import { Product } from '@/types';
import { generateKeyBetween } from 'fractional-indexing';

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

        const snapshot = await productsRef
            .orderBy('position', 'asc')
            .get();

        const products: Product[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            products.push({
                id: doc.id,
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
            });
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

        // Get existing products to calculate position
        const existingProducts = await productsRef
            .orderBy('position', 'asc')
            .get();

        // Generate position for new product (append to end)
        let position: string;
        if (existingProducts.empty) {
            position = generateKeyBetween(null, null); // First product
        } else {
            const lastProduct = existingProducts.docs[existingProducts.docs.length - 1].data();
            position = generateKeyBetween(lastProduct.position, null);
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
        const updatedData = updated.data()!;

        return {
            id: productId,
            name: updatedData.name,
            description: updatedData.description || null,
            price: updatedData.price,
            imageUrl: updatedData.imageUrl || null,
            position: updatedData.position,
            categoryId: updatedData.categoryId,
            tags: updatedData.tags || [],
            allergens: updatedData.allergens || [],
            available: updatedData.available ?? true,
            active: updatedData.active ?? true,
            presence: updatedData.presence,
            variations: updatedData.variations || [],
            calories: updatedData.calories || 0,
            cookingTime: updatedData.cookingTime || 0,
            createdAt: updatedData.createdAt?.toDate() || new Date(),
            updatedAt: updatedData.updatedAt?.toDate() || new Date(),
        };
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
 * Reorder a product using fractional indexing
 */
export async function reorderProduct(
    restaurantId: string,
    menuId: string,
    categoryId: string,
    productId: string,
    beforeId: string | null,
    afterId: string | null
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

        // Get before and after positions
        let beforePosition: string | null = null;
        let afterPosition: string | null = null;

        if (beforeId) {
            const beforeDoc = await productsRef.doc(beforeId).get();
            if (beforeDoc.exists) {
                beforePosition = beforeDoc.data()!.position;
            }
        }

        if (afterId) {
            const afterDoc = await productsRef.doc(afterId).get();
            if (afterDoc.exists) {
                afterPosition = afterDoc.data()!.position;
            }
        }

        // Calculate new position
        const newPosition = generateKeyBetween(beforePosition, afterPosition);

        // Update product
        const productRef = productsRef.doc(productId);
        await productRef.update({
            position: newPosition,
            updatedAt: new Date(),
        });

        // Return updated product
        const updated = await productRef.get();
        const data = updated.data()!;

        return {
            id: productId,
            name: data.name,
            description: data.description || null,
            price: data.price,
            imageUrl: data.imageUrl || null,
            position: data.position,
            categoryId: data.categoryId,
            tags: data.tags || [],
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
        console.error('Error reordering product in Firestore:', error);
        throw new Error('Failed to reorder product');
    }
}
