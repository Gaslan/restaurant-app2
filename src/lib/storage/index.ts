import { StorageProvider, StorageUploadOptions, StorageUploadResult } from './types';
import { CloudinaryStorageProvider } from './providers/cloudinary.provider';

export * from './types';

// Registry of storage providers
const providers: Record<string, StorageProvider> = {
    cloudinary: new CloudinaryStorageProvider(),
    // Gelecekte eklenebilecek alternatif sağlayıcılar:
    // s3: new S3StorageProvider(),
    // r2: new R2StorageProvider(),
    // supabase: new SupabaseStorageProvider(),
};

/**
 * Aktif depolama sağlayıcısını döndürür.
 * Varsayılan olarak ortam değişkeninde STORAGE_PROVIDER belirtilmemişse 'cloudinary' kullanılır.
 */
export function getStorageProvider(providerName?: string): StorageProvider {
    const selectedProvider =
        providerName || process.env.STORAGE_PROVIDER || 'cloudinary';

    const provider = providers[selectedProvider.toLowerCase()];

    if (!provider) {
        throw new Error(
            `Desteklenmeyen depolama sağlayıcısı: "${selectedProvider}". Mevcut sağlayıcılar: ${Object.keys(
                providers
            ).join(', ')}`
        );
    }

    return provider;
}

/**
 * Dosya yüklemek için kullanılan merkezi yardımcı fonksiyon.
 * İlgili depolama sağlayıcısını otomatik seçer ve yüklemeyi gerçekleştirir.
 */
export async function uploadFile(
    options: StorageUploadOptions,
    providerName?: string
): Promise<StorageUploadResult> {
    const provider = getStorageProvider(providerName);
    return provider.upload(options);
}

/**
 * Aktif sağlayıcının konfigürasyonunun geçerli olup olmadığını kontrol eder.
 */
export function isStorageConfigured(providerName?: string): boolean {
    try {
        const provider = getStorageProvider(providerName);
        return provider.isConfigured();
    } catch {
        return false;
    }
}
