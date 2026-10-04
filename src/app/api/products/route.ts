import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

import { getProducts, createProduct } from '@/lib/services/firestore-product.service';
import { productSchema } from '@/lib/validations';

/**
 * GET /api/products?categoryId=xxx&menuId=xxx
 * Get all products for a category
 */
export async function GET(request: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session || !session.user || !(session.user as any).restaurantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const restaurantId = (session.user as any).restaurantId;

        const { searchParams } = new URL(request.url);
        const categoryId = searchParams.get('categoryId');
        const menuId = searchParams.get('menuId');

        if (!categoryId) {
            return NextResponse.json(
                { error: 'categoryId is required' },
                { status: 400 }
            );
        }

        if (!menuId) {
            return NextResponse.json(
                { error: 'menuId is required' },
                { status: 400 }
            );
        }

        const products = await getProducts(restaurantId, menuId, categoryId);

        return NextResponse.json(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        return NextResponse.json(
            { error: 'Failed to fetch products' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/products
 * Create a new product
 */
export async function POST(request: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session || !session.user || !(session.user as any).restaurantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const restaurantId = (session.user as any).restaurantId;

        const body = await request.json();

        // Validate request body
        const validatedData = productSchema.parse(body);
        const { menuId, ...productData } = validatedData;

        // Transform undefined to null for Firestore
        const firestoreData = {
            ...productData,
            description: productData.description ?? null,
            imageUrl: productData.imageUrl ?? null,
            available: productData.available ?? true,
            active: productData.active ?? true,
            tags: productData.tags ?? [],
        };

        if (!menuId) {
            return NextResponse.json(
                { error: 'menuId is required' },
                { status: 400 }
            );
        }

        const newProduct = await createProduct(
            restaurantId,
            menuId,
            firestoreData.categoryId,
            firestoreData
        );

        return NextResponse.json(newProduct, { status: 201 });
    } catch (error: any) {
        console.error('Error creating product:', error);

        if (error.name === 'ZodError') {
            return NextResponse.json(
                { error: 'Validation failed', details: error.errors },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to create product' },
            { status: 500 }
        );
    }
}
