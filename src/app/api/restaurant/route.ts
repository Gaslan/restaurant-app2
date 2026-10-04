import { NextRequest, NextResponse } from 'next/server';
import { getRestaurant, updateRestaurant } from '@/lib/services/firestore-restaurant.service';
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

// GET /api/restaurant - Get restaurant information
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session || !session.user || !(session.user as any).restaurantId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const restaurantId = (session.user as any).restaurantId;
    const restaurant = await getRestaurant(restaurantId);

    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    return NextResponse.json({ data: restaurant, ...restaurant });
  } catch (error) {
    console.error("Error fetching restaurant:", error);
    return NextResponse.json(
      { error: "Failed to fetch restaurant" },
      { status: 500 }
    );
  }
}

// POST /api/restaurant - Update restaurant information (partial allowed)
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

    const updated = await updateRestaurant(restaurantId, body);
    return NextResponse.json({
      data: updated,
      message: 'Restaurant information updated successfully',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to update restaurant information',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// PATCH /api/restaurant - Partial update
export async function PATCH(request: NextRequest) {
  return POST(request);
}
