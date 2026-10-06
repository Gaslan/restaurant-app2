import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { uploadImageToCloudinary, isCloudinaryConfigured } from '@/lib/cloudinary';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/avif',
    'image/svg+xml',
];

export async function POST(request: NextRequest) {
    try {
        // Authenticate request
        const session = await auth.api.getSession({
            headers: await headers(),
        });

        if (!session || !session.user || !(session.user as any).restaurantId) {
            return NextResponse.json(
                { error: 'Yetkisiz erişim. Lütfen giriş yapın.' },
                { status: 401 }
            );
        }

        const restaurantId = (session.user as any).restaurantId;

        // Check Cloudinary configuration
        if (!isCloudinaryConfigured()) {
            return NextResponse.json(
                {
                    error: 'Cloudinary API anahtarları tanımlanmamış. Lütfen .env.local dosyasına CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY ve CLOUDINARY_API_SECRET değerlerini ekleyin.',
                },
                { status: 500 }
            );
        }

        // Parse form data
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const subfolder = (formData.get('folder') as string) || 'products';

        if (!file) {
            return NextResponse.json(
                { error: 'Lütfen yüklenecek bir resim dosyası seçin.' },
                { status: 400 }
            );
        }

        // Validate file type
        if (!ALLOWED_MIME_TYPES.includes(file.type)) {
            return NextResponse.json(
                {
                    error: 'Desteklenmeyen dosya türü. Yalnızca JPEG, PNG, WEBP, GIF, AVIF veya SVG formatları kabul edilir.',
                },
                { status: 400 }
            );
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: 'Dosya boyutu çok büyük. Maksimum dosya boyutu 10MB olabilir.' },
                { status: 400 }
            );
        }

        // Convert file to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to Cloudinary under the restaurant's folder
        const targetFolder = `restaurants/${restaurantId}/${subfolder}`;
        const uploadResult = await uploadImageToCloudinary(buffer, targetFolder);

        return NextResponse.json({
            success: true,
            url: uploadResult.secure_url,
            publicId: uploadResult.public_id,
            width: uploadResult.width,
            height: uploadResult.height,
            format: uploadResult.format,
        });
    } catch (error: any) {
        console.error('Image upload error:', error);
        return NextResponse.json(
            {
                error: error?.message || 'Resim yüklenirken bir hata oluştu.',
            },
            { status: 500 }
        );
    }
}
