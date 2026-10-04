import { NextRequest } from 'next/server';
import * as firestoreRestaurantService from '@/lib/services/firestore-restaurant.service';

// GET /api/restaurant/[restaurantId] - Get restaurant details
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ restaurantId: string }> }
) {
    try {
        const { restaurantId } = await params;
        const restaurant = await firestoreRestaurantService.getRestaurant(restaurantId);

        if (!restaurant) {
            return Response.json(
                {
                    error: 'Restaurant not found',
                    details: `No restaurant found with id: ${restaurantId}`,
                },
                { status: 404 }
            );
        }

        return Response.json({
            data: restaurant,
            message: 'Restaurant retrieved successfully',
        });
    } catch (error) {
        console.error('Error in GET /api/restaurant/[restaurantId]:', error);
        return Response.json(
            {
                error: 'Failed to retrieve restaurant',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
