import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

// Configure Cloudinary with environment variables
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

export function isCloudinaryConfigured(): boolean {
    return Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
    );
}

/**
 * Uploads an image buffer to Cloudinary
 * @param buffer - File data as Buffer
 * @param folder - Cloudinary folder path
 */
export async function uploadImageToCloudinary(
    buffer: Buffer,
    folder: string = 'restaurant-menu/products'
): Promise<UploadApiResponse> {
    if (!isCloudinaryConfigured()) {
        throw new Error(
            'Cloudinary yapılandırması eksik! Lütfen CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY ve CLOUDINARY_API_SECRET ortam değişkenlerini .env.local dosyasına ekleyin.'
        );
    }

    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: 'image',
                transformation: [
                    { quality: 'auto', fetch_format: 'auto' }
                ],
            },
            (error, result) => {
                if (error || !result) {
                    return reject(error || new Error('Cloudinary yükleme hatası'));
                }
                resolve(result);
            }
        );

        uploadStream.end(buffer);
    });
}

export default cloudinary;
