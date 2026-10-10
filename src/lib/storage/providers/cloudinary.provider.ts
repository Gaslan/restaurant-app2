import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { StorageProvider, StorageUploadOptions, StorageUploadResult } from '../types';

// Configure Cloudinary from environment variables
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

export class CloudinaryStorageProvider implements StorageProvider {
    readonly name = 'cloudinary';

    isConfigured(): boolean {
        return Boolean(
            process.env.CLOUDINARY_CLOUD_NAME &&
            process.env.CLOUDINARY_API_KEY &&
            process.env.CLOUDINARY_API_SECRET
        );
    }

    async upload(options: StorageUploadOptions): Promise<StorageUploadResult> {
        if (!this.isConfigured()) {
            throw new Error(
                'Cloudinary yapılandırması eksik! Lütfen CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY ve CLOUDINARY_API_SECRET ortam değişkenlerini .env.local dosyasına ekleyin.'
            );
        }

        const subfolder = options.folder || 'products';
        const targetFolder = options.restaurantId
            ? `restaurants/${options.restaurantId}/${subfolder}`
            : `restaurants/general/${subfolder}`;

        return new Promise<StorageUploadResult>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: targetFolder,
                    resource_type: 'image',
                    transformation: [
                        { quality: 'auto', fetch_format: 'auto' },
                    ],
                },
                (error, result: UploadApiResponse | undefined) => {
                    if (error || !result) {
                        return reject(error || new Error('Cloudinary yükleme hatası'));
                    }
                    resolve({
                        url: result.secure_url,
                        publicId: result.public_id,
                        width: result.width,
                        height: result.height,
                        format: result.format,
                        provider: this.name,
                    });
                }
            );

            uploadStream.end(options.fileBuffer);
        });
    }

    async delete(fileId: string): Promise<boolean> {
        if (!this.isConfigured()) {
            throw new Error('Cloudinary yapılandırması eksik!');
        }

        try {
            const result = await cloudinary.uploader.destroy(fileId);
            return result.result === 'ok';
        } catch (error) {
            console.error('Cloudinary delete error:', error);
            return false;
        }
    }
}
