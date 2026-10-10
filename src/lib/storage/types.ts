export interface StorageUploadOptions {
    fileBuffer: Buffer;
    filename?: string;
    mimeType?: string;
    folder?: string; // e.g. 'products', 'categories', 'avatars'
    restaurantId?: string;
}

export interface StorageUploadResult {
    url: string;
    publicId: string;
    width?: number;
    height?: number;
    format?: string;
    provider: string;
}

export interface StorageProvider {
    readonly name: string;
    isConfigured(): boolean;
    upload(options: StorageUploadOptions): Promise<StorageUploadResult>;
    delete?(fileId: string): Promise<boolean>;
}
