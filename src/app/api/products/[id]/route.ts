import { NextRequest, NextResponse } from 'next/server';
import {
    getProductById,
    getProductWithoutCategory,
    updateProduct,
    deleteProduct,
} from '@/lib/services/firestore-product.service';
import { productSchema } from '@/lib/validations';
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

/**
 * GET /api/products/[id]
 * Get a single product by ID
 * Query params: menuId (required), categoryId (optional - will search all categories if not provided)
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const menuId = searchParams.get('menuId');
        const categoryId = searchParams.get('categoryId');
        let restaurantId = searchParams.get('restaurantId');

        if (!restaurantId) {
            const session = await auth.api.getSession({
                headers: await headers()
            });
            if (session?.user && (session.user as any).restaurantId) {
                restaurantId = (session.user as any).restaurantId;
            }
        }

        if (!restaurantId) {
            return NextResponse.json(
                { error: 'Unauthorized', details: 'Restaurant ID required' },
                { status: 401 }
            );
        }

        if (!menuId) {
            return NextResponse.json(
                { error: 'menuId is required' },
                { status: 400 }
            );
        }

        let product;
        if (categoryId) {
            product = await getProductById(restaurantId, menuId, categoryId, id);
        } else {
            product = await getProductWithoutCategory(restaurantId, menuId, id);
        }

        if (!product) {
            return NextResponse.json(
                { error: 'Product not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ data: product });
    } catch (error) {
        console.error('Error fetching product:', error);
        return NextResponse.json(
            { error: 'Failed to fetch product' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/products/[id]
 * Update a product
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

        // Validate with partial schema
        const validatedData = productSchema.partial().parse(body);
        const { menuId: _, ...productData } = validatedData;

        if (!menuId || !categoryId) {
            return NextResponse.json(
                { error: 'menuId and categoryId are required' },
                { status: 400 }
            );
        }

        const updatedProduct = await updateProduct(
            restaurantId,
            menuId,
            categoryId,
            id,
            productData
        );

        if (!updatedProduct) {
            return NextResponse.json(
                { error: 'Product not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(updatedProduct);
    } catch (error: any) {
        console.error('Error updating product:', error);

        if (error.name === 'ZodError') {
            return NextResponse.json(
                { error: 'Validation failed', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to update product' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/products/[id]
 * Delete a product
 */
export async function DELETE(
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
        const { searchParams } = new URL(request.url);
        const menuId = searchParams.get('menuId');
        const categoryId = searchParams.get('categoryId');

        if (!menuId || !categoryId) {
            return NextResponse.json(
                { error: 'menuId and categoryId are required' },
                { status: 400 }
            );
        }

        await deleteProduct(restaurantId, menuId, categoryId, id);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting product:', error);
        return NextResponse.json(
            { error: 'Failed to delete product' },
            { status: 500 }
        );
    }
}
