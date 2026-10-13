'use server'

import { batchUpdateProductPrices } from '@/lib/services/firestore-product.service';
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
        await batchUpdateProductPrices(updates);

        revalidatePath('/price-editor');
        revalidatePath('/menus');
        revalidatePath('/menu2');

        return { success: true };
    } catch (error) {
        console.error('Failed to update product prices:', error);
        return { success: false, error: 'Failed to update prices' };
    }
}

