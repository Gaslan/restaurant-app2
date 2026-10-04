import { NextRequest, NextResponse } from 'next/server';
import { reorderProduct } from '@/lib/services/firestore-product.service';
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

/**
 * PATCH /api/products/[id]/reorder
 * Reorder a product using fractional indexing
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session || !session.user || !(session.user as any).restaurantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const restaurantId = (session.user as any).restaurantId;

        const { id } = await params;
        const body = await request.json();
        const { searchParams } = new URL(request.url);
        const menuId = searchParams.get('menuId');
        const categoryId = searchParams.get('categoryId');

        const { previousProductId, nextProductId } = body;

        if (!menuId || !categoryId) {
            return NextResponse.json(
                { error: 'menuId and categoryId are required for reordering' },
                { status: 400 }
            );
        }

        const updatedProduct = await reorderProduct(
            restaurantId,
            menuId,
            categoryId,
            id,
            previousProductId || null,
            nextProductId || null
        );

        if (!updatedProduct) {
            return NextResponse.json(
                { error: 'Product not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(updatedProduct);
    } catch (error) {
        console.error('Error reordering product:', error);
        return NextResponse.json(
            { error: 'Failed to reorder product' },
            { status: 500 }
        );
    }
}
