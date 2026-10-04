import { getFirestoreDb } from '../firebase-admin';
import type { Menu, MenuWithDetails, Restaurant } from '@/types';
import { FieldValue } from 'firebase-admin/firestore';
import { getCategories } from './firestore-category.service';
import { getProducts } from './firestore-product.service';
import { getRestaurant } from './firestore-restaurant.service';



/**
 * Firestore Menu Service
 * Handles all menu CRUD operations with Firestore
 */

/**
 * Get all menus for a restaurant
 */
export async function getMenus(restaurantId: string): Promise<Menu[]> {
    const db = getFirestoreDb();

    try {
        const menusRef = db
            .collection('restaurants')
            .doc(restaurantId)
            .collection('menus');

        const snapshot = await menusRef
            .orderBy('orderValue', 'asc')
            .get();

        const menus: Menu[] = [];
        snapshot.forEach((doc) => {
            const data = doc.data();
            menus.push({
                id: doc.id,
                name: data.name,
                orderValue: data.orderValue,
                isActive: data.isActive,
                restaurantId: data.restaurantId,
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date(),
            });
        });

        return menus;
    } catch (error) {
        console.error('Error fetching menus from Firestore:', error);
        throw new Error('Failed to fetch menus');
    }
}

/**
 * Get a single menu by ID
 */
export async function getMenuById(
    restaurantId: string,
    menuId: string
): Promise<Menu | null> {
    const db = getFirestoreDb();

    try {
        const menuRef = db
            .collection('restaurants')
            .doc(restaurantId)
            .collection('menus')
            .doc(menuId);

        const doc = await menuRef.get();

        if (!doc.exists) {
            return null;
        }

        const data = doc.data()!;
        return {
            id: doc.id,
            name: data.name,
            orderValue: data.orderValue,
            isActive: data.isActive,
            restaurantId: data.restaurantId,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
        };
    } catch (error) {
        console.error('Error fetching menu from Firestore:', error);
        throw new Error('Failed to fetch menu');
    }
}

/**
 * Create a new menu
 */
export async function createMenu(
    restaurantId: string,
    data: { name: string; isActive: boolean; orderValue?: number }
): Promise<Menu> {
    const db = getFirestoreDb();

    try {
        const menusRef = db
            .collection('restaurants')
            .doc(restaurantId)
            .collection('menus');

        // Calculate next orderValue if not provided
        let orderValue = data.orderValue;
        if (orderValue === undefined) {
            const snapshot = await menusRef
                .orderBy('orderValue', 'desc')
                .limit(1)
                .get();

            if (snapshot.empty) {
                orderValue = 1;
            } else {
                const maxOrder = snapshot.docs[0].data().orderValue || 0;
                orderValue = maxOrder + 1;
            }
        }

        const now = FieldValue.serverTimestamp();
        const menuData = {
            name: data.name,
            orderValue,
            isActive: data.isActive,
            restaurantId,
            createdAt: now,
            updatedAt: now,
        };

        const docRef = await menusRef.add(menuData);

        // Fetch the created document to return with server timestamp
        const createdDoc = await docRef.get();
        const createdData = createdDoc.data()!;

        return {
            id: docRef.id,
            name: createdData.name,
            orderValue: createdData.orderValue,
            isActive: createdData.isActive,
            restaurantId: createdData.restaurantId,
            createdAt: createdData.createdAt?.toDate() || new Date(),
            updatedAt: createdData.updatedAt?.toDate() || new Date(),
        };
    } catch (error) {
        console.error('Error creating menu in Firestore:', error);
        throw new Error('Failed to create menu');
    }
}

/**
 * Update an existing menu
 */
export async function updateMenu(
    restaurantId: string,
    menuId: string,
    data: Partial<{ name: string; isActive: boolean; orderValue: number }>
): Promise<Menu> {
    const db = getFirestoreDb();

    try {
        const menuRef = db
            .collection('restaurants')
            .doc(restaurantId)
            .collection('menus')
            .doc(menuId);

        // Check if menu exists
        const doc = await menuRef.get();
        if (!doc.exists) {
            throw new Error('Menu not found');
        }

        const updateData: any = {
            ...data,
            updatedAt: FieldValue.serverTimestamp(),
        };

        await menuRef.update(updateData);

        // Fetch updated document
        const updatedDoc = await menuRef.get();
        const updatedData = updatedDoc.data()!;

        return {
            id: menuId,
            name: updatedData.name,
            orderValue: updatedData.orderValue,
            isActive: updatedData.isActive,
            restaurantId: updatedData.restaurantId,
            createdAt: updatedData.createdAt?.toDate() || new Date(),
            updatedAt: updatedData.updatedAt?.toDate() || new Date(),
        };
    } catch (error) {
        console.error('Error updating menu in Firestore:', error);
        throw new Error('Failed to update menu');
    }
}

/**
 * Delete a menu
 */
export async function deleteMenu(
    restaurantId: string,
    menuId: string
): Promise<void> {
    const db = getFirestoreDb();

    try {
        const menuRef = db
            .collection('restaurants')
            .doc(restaurantId)
            .collection('menus')
            .doc(menuId);

        // Check if menu exists
        const doc = await menuRef.get();
        if (!doc.exists) {
            throw new Error('Menu not found');
        }

        await menuRef.delete();
    } catch (error) {
        console.error('Error deleting menu from Firestore:', error);
        throw new Error('Failed to delete menu');
    }
}

/**
 * Toggle menu active status
 */
export async function toggleMenuActive(
    restaurantId: string,
    menuId: string,
    isActive: boolean
): Promise<Menu> {
    return updateMenu(restaurantId, menuId, { isActive });
}

/**
 * Get menu with full details (categories and products)
 */
export async function getMenuWithDetails(
    restaurantId: string,
    menuId: string
): Promise<MenuWithDetails | null> {
    const menu = await getMenuById(restaurantId, menuId);
    if (!menu) return null;

    try {
        const categories = await getCategories(restaurantId, menuId);

        const categoriesWithProducts = await Promise.all(
            categories.map(async (category) => {
                const products = await getProducts(restaurantId, menuId, category.id);
                return {
                    ...category,
                    products
                };
            })
        );

        return {
            ...menu,
            categories: categoriesWithProducts
        };
    } catch (error) {
        console.error('Error fetching menu details:', error);
        // Fallback to menu without categories if details fail
        return {
            ...menu,
            categories: []
        };
    }
}

/**
 * Public Menu response interface
 */
export interface PublicMenuData {
    menu: MenuWithDetails;
    restaurant: Restaurant | null;
}

/**
 * Get public menu and its restaurant details by menuId
 */
export async function getPublicMenuByMenuId(
    menuId: string,
    restaurantIdHint?: string | null
): Promise<PublicMenuData | null> {
    const db = getFirestoreDb();

    try {
        let restaurantId = restaurantIdHint;

        if (!restaurantId) {
            // Find which restaurant this menu belongs to
            const snapshot = await db.collectionGroup('menus').get();
            const targetDoc = snapshot.docs.find(doc => doc.id === menuId);

            if (!targetDoc) {
                return null;
            }

            const data = targetDoc.data();
            restaurantId = data.restaurantId || targetDoc.ref.parent.parent?.id;
        }

        if (!restaurantId) {
            return null;
        }

        const [menuWithDetails, restaurant] = await Promise.all([
            getMenuWithDetails(restaurantId, menuId),
            getRestaurant(restaurantId).catch(() => null),
        ]);

        if (!menuWithDetails) {
            return null;
        }

        return {
            menu: menuWithDetails,
            restaurant,
        };
    } catch (error) {
        console.error('Error fetching public menu:', error);
        return null;
    }
}

/**
 * Serializes public menu data so that Date objects become plain strings
 */
export function serializePublicMenuData(data: PublicMenuData): PublicMenuData {
    return JSON.parse(JSON.stringify(data));
}
