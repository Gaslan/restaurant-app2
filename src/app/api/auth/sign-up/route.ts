import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { createRestaurant } from '@/lib/services/firestore-restaurant.service';
import { getFirestoreDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

interface SignUpRequestBody {
    name?: string;
    userName?: string;
    email?: string;
    password?: string;
    restaurantName?: string;
}

export async function POST(request: NextRequest) {
    let createdRestaurantId: string | null = null;
    const db = getFirestoreDb();

    try {
        const body = (await request.json()) as SignUpRequestBody;
        const displayName = (body.name || body.userName || '').trim();
        const email = (body.email || '').trim().toLowerCase();
        const password = body.password || '';
        const restaurantName = (body.restaurantName || '').trim();

        // 1. Validate inputs
        if (!displayName || displayName.length < 2) {
            return NextResponse.json(
                { error: 'Lütfen geçerli bir isim giriniz (en az 2 karakter).' },
                { status: 400 }
            );
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            return NextResponse.json(
                { error: 'Lütfen geçerli bir e-posta adresi giriniz.' },
                { status: 400 }
            );
        }

        if (!password || password.length < 6) {
            return NextResponse.json(
                { error: 'Şifre en az 6 karakter olmalıdır.' },
                { status: 400 }
            );
        }

        if (!restaurantName || restaurantName.length < 2) {
            return NextResponse.json(
                { error: 'Lütfen geçerli bir restoran adı giriniz (en az 2 karakter).' },
                { status: 400 }
            );
        }

        // 2. Check if user already exists
        const existingUsersSnapshot = await db
            .collection('users')
            .where('email', '==', email)
            .limit(1)
            .get();

        if (!existingUsersSnapshot.empty) {
            return NextResponse.json(
                { error: 'Bu e-posta adresi ile kayıtlı bir hesap zaten bulunmaktadır.' },
                { status: 400 }
            );
        }

        // 3. Create restaurant in Firestore
        const restaurant = await createRestaurant({
            name: restaurantName,
            email,
            currency: 'TRY',
        });
        createdRestaurantId = restaurant.id;

        // 4. Create user in Better Auth
        const reqHeaders = await headers();
        let signUpResult: any;

        try {
            signUpResult = await auth.api.signUpEmail({
                body: {
                    name: displayName,
                    email,
                    password,
                    restaurantId: restaurant.id,
                },
                headers: reqHeaders,
            });
        } catch (authError: any) {
            console.error('Better Auth registration error:', authError);
            // Rollback created restaurant so no orphaned restaurant remains
            if (createdRestaurantId) {
                await db.collection('restaurants').doc(createdRestaurantId).delete().catch(() => {});
            }
            return NextResponse.json(
                {
                    error: authError?.message || 'Kullanıcı hesabı oluşturulurken bir hata oluştu.',
                },
                { status: 400 }
            );
        }

        const userId = signUpResult?.user?.id;

        if (userId) {
            // 5. Ensure bidirectional relationship
            // Update restaurant ownerId
            const updateOwnerPromises = [
                db.collection('restaurants').doc(restaurant.id).set({ ownerId: userId }, { merge: true }),
                db.collection('restaurants').doc(restaurant.id).collection('settings').doc('restaurant').set({ ownerId: userId }, { merge: true }),
                // Guarantee user document has restaurantId & authority
                db.collection('users').doc(userId).set({
                    restaurantId: restaurant.id,
                    authority: ['admin'],
                }, { merge: true }),
            ];

            await Promise.all(updateOwnerPromises);
        }

        return NextResponse.json({
            success: true,
            message: 'Hesap ve restoran başarıyla oluşturuldu.',
            data: {
                userId,
                restaurantId: restaurant.id,
                restaurantName: restaurant.name,
            },
        });
    } catch (error: any) {
        console.error('Registration unexpected error:', error);

        // Cleanup on unexpected failure
        if (createdRestaurantId) {
            await db.collection('restaurants').doc(createdRestaurantId).delete().catch(() => {});
        }

        return NextResponse.json(
            {
                error: error?.message || 'Kayıt işlemi sırasında beklenmeyen bir hata meydana geldi.',
            },
            { status: 500 }
        );
    }
}
