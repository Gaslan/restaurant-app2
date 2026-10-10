'use client';

import { ImageUpload, type ImageUploadProps } from '@/components/shared/image-upload';

export interface ProductImageUploadProps extends Omit<ImageUploadProps, 'imageAlt'> {
    imageAlt?: string;
}

export function ProductImageUpload(props: ProductImageUploadProps) {
    return (
        <ImageUpload
            {...props}
            folder={props.folder || 'products'}
            imageAlt={props.imageAlt || 'Ürün Görseli'}
        />
    );
}

export default ProductImageUpload;
