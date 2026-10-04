import { NextRequest, NextResponse } from 'next/server';
import * as firestoreMenuService from '@/lib/services/firestore-menu.service';
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// GET /api/menus - Get all menus
export async function GET(request: NextRequest) {
    try {
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

        const menus = await firestoreMenuService.getMenus(restaurantId);

        return Response.json({
            data: menus,
            message: 'Menus retrieved successfully',
        });
    } catch (error) {
        console.error('Error in GET /api/menus:', error);
        return Response.json(
            {
                error: 'Failed to retrieve menus',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

// POST /api/menus - Create a new menu
export async function POST(request: NextRequest) {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (!session || !session.user || !session.user.restaurantId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const restaurantId = session.user.restaurantId;

        const body = await request.json();

        // Basic validation
        if (!body.name || typeof body.name !== 'string') {
            return Response.json(
                {
                    error: 'Invalid request',
                    details: 'Menu name is required and must be a string',
                },
                { status: 400 }
            );
        }

        const menuData = {
            name: body.name,
            isActive: body.isActive ?? true,
            orderValue: body.orderValue,
        };

        const newMenu = await firestoreMenuService.createMenu(
            restaurantId,
            menuData
        );

        return Response.json(
            {
                data: newMenu,
                message: 'Menu created successfully',
            },
            { status: 201 }
        );
    } catch (error) {
        console.error('Error in POST /api/menus:', error);
        return Response.json(
            {
                error: 'Failed to create menu',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
