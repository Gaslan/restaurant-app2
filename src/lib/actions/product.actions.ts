'use server'

import { updateProduct } from '@/lib/services/firestore-product.service';
import { revalidatePath } from 'next/cache';

export interface PriceUpdateInput {
    productId: string;
    price: number;
    menuId: string;
    categoryId: string;
    restaurantId: string;
}

export async function updateProductPrices(updates: PriceUpdateInput[]) {
    try {
        for (const update of updates) {
            await updateProduct(
                update.restaurantId,
                update.menuId,
                update.categoryId,
                update.productId,
                { price: update.price }
            );
        }

        revalidatePath('/price-editor');
        revalidatePath('/menus');

        return { success: true };
    } catch (error) {
        console.error('Failed to update product prices:', error);
        return { success: false, error: 'Failed to update prices' };
    }
}
