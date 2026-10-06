import { NextRequest, NextResponse } from 'next/server';
import * as firestoreCategoryService from '@/lib/services/firestore-category.service';
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// PATCH /api/menus/[menuId]/categories/[id]/reorder - Reorder category
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
        const { beforeId, afterId, orderedCategoryIds } = body;

        const updated = await firestoreCategoryService.reorderCategory(
            restaurantId,
            menuId,
            id,
            beforeId,
            afterId,
            orderedCategoryIds
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
            message: 'Category reordered successfully',
        });
    } catch (error) {
        console.error('Error in PATCH /api/menus/[menuId]/categories/[id]/reorder:', error);

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
                error: 'Failed to reorder category',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
