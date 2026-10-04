import { NextRequest, NextResponse } from 'next/server';
import * as firestoreCategoryService from '@/lib/services/firestore-category.service';
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// GET /api/menus/[menuId]/categories/[id] - Get category by ID
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ menuId: string; id: string }> }
) {
    try {
        const { menuId, id } = await params;
        const { searchParams } = new URL(request.url);
        let restaurantId = searchParams.get('restaurantId');

        if (!restaurantId) {
            const session = await auth.api.getSession({
                headers: await headers()
            });
            if (session && session.user && (session.user as any).restaurantId) {
                restaurantId = (session.user as any).restaurantId;
            }
        }

        if (!restaurantId) {
            return Response.json(
                { error: 'Unauthorized', details: 'Restaurant ID required' },
                { status: 401 }
            );
        }

        const category = await firestoreCategoryService.getCategoryById(
            restaurantId,
            menuId,
            id
        );

        if (!category) {
            return Response.json(
                {
                    error: 'Category not found',
                    details: `No category found with id: ${id}`,
                },
                { status: 404 }
            );
        }

        return Response.json({
            data: category,
            message: 'Category retrieved successfully',
        });
    } catch (error) {
        console.error('Error in GET /api/menus/[menuId]/categories/[id]:', error);
        return Response.json(
            {
                error: 'Failed to retrieve category',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

// PATCH /api/menus/[menuId]/categories/[id] - Update category
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ menuId: string; id: string }> }
) {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session || !session.user || !(session.user as any).restaurantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const restaurantId = (session.user as any).restaurantId;

        const { menuId, id } = await params;
        const body = await request.json();
        const updated = await firestoreCategoryService.updateCategory(
            restaurantId,
            menuId,
            id,
            body
        );

        if (!updated) {
            return Response.json(
                {
                    error: 'Category not found',
                    details: `No category found with id: ${id}`,
                },
                { status: 404 }
            );
        }

        return Response.json({
            data: updated,
            message: 'Category updated successfully',
        });
    } catch (error) {
        console.error('Error in PATCH /api/menus/[menuId]/categories/[id]:', error);

        // Handle specific Firestore errors
        if (error instanceof Error && error.message === 'Category not found') {
            const { id } = await params;
            return Response.json(
                {
                    error: 'Category not found',
                    details: `No category found with id: ${id}`,
                },
                { status: 404 }
            );
        }

        return Response.json(
            {
                error: 'Failed to update category',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

// DELETE /api/menus/[menuId]/categories/[id] - Delete category
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ menuId: string; id: string }> }
) {
    const { menuId, id } = await params;

    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session || !session.user || !(session.user as any).restaurantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const restaurantId = (session.user as any).restaurantId;

        await firestoreCategoryService.deleteCategory(
            restaurantId,
            menuId,
            id
        );

        return Response.json({
            data: { id },
            message: 'Category deleted successfully',
        });
    } catch (error) {
        console.error('Error in DELETE /api/menus/[menuId]/categories/[id]:', error);

        // Handle specific Firestore errors
        if (error instanceof Error && error.message === 'Category not found') {
            return Response.json(
                {
                    error: 'Category not found',
                    details: `No category found with id: ${id}`,
                },
                { status: 404 }
            );
        }

        return Response.json(
            {
                error: 'Failed to delete category',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
