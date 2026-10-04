import { NextRequest, NextResponse } from 'next/server';
import { updateRestaurant } from '@/lib/services/firestore-restaurant.service';
import { auth } from "@/lib/auth";
import { getFirestoreDb } from "@/lib/firebase-admin";
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

    const db = getFirestoreDb();
    const doc = await db.collection("restaurants").doc(restaurantId).get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    return NextResponse.json(doc.data());
  } catch (error) {
    console.error("Error fetching restaurant:", error);
    return NextResponse.json(
      { error: "Failed to fetch restaurant" },
      { status: 500 }
    );
  }
}

// POST /api/restaurant - Update restaurant information
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
          details: 'Restaurant name is required and must be a string',
        },
        { status: 400 }
      );
    }

    const updated = await updateRestaurant(restaurantId, body);
    return Response.json({
      data: updated,
      message: 'Restaurant information updated successfully',
    });
  } catch (error) {
    return Response.json(
      {
        error: 'Failed to update restaurant information',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
