import { NextRequest, NextResponse } from 'next/server';
import * as firestoreMenuService from '@/lib/services/firestore-menu.service';
import { getMenuWithDetails } from '@/lib/services/firestore-menu.service';
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

// GET /api/menus/[id] - Get menu by ID
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ menuId: string }> }
) {
    try {
        const { menuId } = await params;

        // Support both query param (public access) and default (admin access)
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

        const menu = await getMenuWithDetails(restaurantId, menuId);

        if (!menu) {
            return Response.json(
                {
                    error: 'Menu not found',
                    details: `No menu found with id: ${menuId}`,
                },
                { status: 404 }
            );
        }

        return Response.json({
            data: menu,
            message: 'Menu retrieved successfully',
        });
    } catch (error) {
        console.error('Error in GET /api/menus/[id]:', error);
        return Response.json(
            {
                error: 'Failed to retrieve menu',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

// PATCH /api/menus/[menuId] - Update menu
export async function PATCH(
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
        const updated = await firestoreMenuService.updateMenu(
            restaurantId,
            menuId,
            body
        );

        if (!updated) {
            return Response.json(
                {
                    error: 'Menu not found',
                    details: `No menu found with id: ${menuId}`,
                },
                { status: 404 }
            );
        }

        return Response.json({
            data: updated,
            message: 'Menu updated successfully',
        });
    } catch (error) {
        console.error('Error in PATCH /api/menus/[id]:', error);
        return Response.json(
            {
                error: 'Failed to update menu',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

// DELETE /api/menus/[id] - Delete menu
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ menuId: string }> }
) {
    const { menuId } = await params;

    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session || !session.user || !(session.user as any).restaurantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const restaurantId = (session.user as any).restaurantId;

        await firestoreMenuService.deleteMenu(restaurantId, menuId);

        return Response.json({
            data: { menuId },
            message: 'Menu deleted successfully',
        });
    } catch (error) {
        console.error('Error in DELETE /api/menus/[id]:', error);

        // Handle specific Firestore errors
        if (error instanceof Error && error.message === 'Menu not found') {
            return Response.json(
                {
                    error: 'Menu not found',
                    details: `No menu found with id: ${menuId}`,
                },
                { status: 404 }
            );
        }

        return Response.json(
            {
                error: 'Failed to delete menu',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
