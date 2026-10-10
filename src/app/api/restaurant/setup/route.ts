import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { createRestaurant } from '@/lib/services/firestore-restaurant.service';
import { getFirestoreDb } from '@/lib/firebase-admin';
import type { Currency } from '@/types';

export const runtime = 'nodejs';

interface SetupRestaurantBody {
    name?: string;
    phone?: string;
    currency?: Currency;
    description?: string;
}

export async function POST(request: NextRequest) {
    try {
        const reqHeaders = await headers();
        const session = await auth.api.getSession({
            headers: reqHeaders,
        });

        if (!session || !session.user) {
            return NextResponse.json(
                { error: 'Yetkisiz erişim. Lütfen önce giriş yapın.' },
                { status: 401 }
            );
        }

        const userId = session.user.id;
        const userEmail = session.user.email || '';

        // Check if user already has a restaurantId in session or in Firestore
        const db = getFirestoreDb();
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.exists ? userDoc.data() : null;

        const existingRestaurantId = (session.user as any).restaurantId || userData?.restaurantId;
        if (existingRestaurantId) {
            return NextResponse.json({
                success: true,
                message: 'Zaten bir restoran kaydınız bulunmaktadır.',
                restaurantId: existingRestaurantId,
            });
        }

        const body = (await request.json()) as SetupRestaurantBody;
        const name = (body.name || '').trim();
        const phone = (body.phone || '').trim();
        const currency = body.currency || 'TRY';
        const description = (body.description || '').trim();

        if (!name || name.length < 2) {
            return NextResponse.json(
                { error: 'Lütfen geçerli bir restoran adı giriniz (en az 2 karakter).' },
                { status: 400 }
            );
        }

        // 1. Create restaurant
        const restaurant = await createRestaurant({
            name,
            ownerId: userId,
            email: userEmail,
            phone,
            currency,
            description,
        });

        // 2. Associate restaurant with user in Firestore
        await db.collection('users').doc(userId).set({
            restaurantId: restaurant.id,
            authority: ['admin'],
            updatedAt: new Date(),
        }, { merge: true });

        return NextResponse.json({
            success: true,
            message: 'Restoranınız başarıyla oluşturuldu ve hesabınızla eşleştirildi.',
            data: {
                restaurantId: restaurant.id,
                restaurantName: restaurant.name,
            },
        });
    } catch (error: any) {
        console.error('Restaurant setup error:', error);
        return NextResponse.json(
            {
                error: error?.message || 'Restoran oluşturulurken bir hata meydana geldi.',
            },
            { status: 500 }
        );
    }
}
