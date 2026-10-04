import { NextRequest, NextResponse } from 'next/server';
import * as firestoreCategoryService from '@/lib/services/firestore-category.service';
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// GET /api/menus/[menuId]/categories - Get all categories for a menu
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ menuId: string }> }
) {
    try {
        const { menuId } = await params;
        const { searchParams } = new URL(request.url);
        let restaurantId = searchParams.get('restaurantId');

        if (!restaurantId) {
            const session = await auth.api.getSession({
                headers: await headers()
            });
            if (session?.user?.restaurantId) {
                restaurantId = session.user.restaurantId as string;
            }
        }

        if (!restaurantId) {
            return Response.json(
                { error: 'Unauthorized', details: 'Restaurant ID required' },
                { status: 401 }
            );
        }

        const categories = await firestoreCategoryService.getCategories(
            restaurantId,
            menuId
        );

        return Response.json({
            data: categories,
            message: 'Categories retrieved successfully',
        });
    } catch (error) {
        console.error('Error in GET /api/menus/[menuId]/categories:', error);
        return Response.json(
            {
                error: 'Failed to retrieve categories',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

// POST /api/menus/[menuId]/categories - Create a new category for a menu
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ menuId: string }> }
) {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session || !session.user || !(session.user as any).restaurantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const restaurantId = (session.user as any).restaurantId;

        const { menuId } = await params;
        const body = await request.json();

        // Basic validation
        if (!body.name || typeof body.name !== 'string') {
            return Response.json(
                {
                    error: 'Invalid request',
                    details: 'Category name is required and must be a string',
                },
                { status: 400 }
            );
        }

        const categoryData = {
            name: body.name,
            description: body.description || null,
            imageUrl: body.imageUrl || null,
        };

        // Use Firestore - position auto-generated
        const newCategory = await firestoreCategoryService.createCategory(
            restaurantId,
            menuId,
            categoryData
        );

        return Response.json(
            {
                data: newCategory,
                message: 'Category created successfully',
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error in POST /api/menus/[menuId]/categories:', error);
        return Response.json(
            {
                error: 'Failed to create category',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
