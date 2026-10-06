'use client';

import { useState, useRef, type ChangeEvent, type DragEvent } from 'react';
import { UploadCloud, Trash2, Loader2, ExternalLink, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui';

interface ProductImageUploadProps {
    value?: string | null;
    onChange: (url: string) => void;
    folder?: string;
    disabled?: boolean;
}

export function ProductImageUpload({
    value,
    onChange,
    folder = 'products',
    disabled = false,
}: ProductImageUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (file: File) => {
        // Validation: Type
        if (!file.type.startsWith('image/')) {
            toast.error('Lütfen geçerli bir resim dosyası seçin (PNG, JPG, WEBP vb.)');
            return;
        }

        // Validation: Size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            toast.error('Dosya boyutu 10MB\'dan küçük olmalıdır.');
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', folder);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Resim yüklenemedi.');
            }

            onChange(data.url);
            toast.success('Görsel başarıyla yüklendi!');
        } catch (error: any) {
            console.error('Upload error:', error);
            toast.error(error.message || 'Resim yükleme işlemi başarısız oldu.');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (!disabled && !isUploading) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (disabled || isUploading) return;

        const file = e.dataTransfer.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleRemoveImage = () => {
        onChange('');
        toast.info('Görsel kaldırıldı.');
    };

    return (
        <div className="space-y-3">
            {/* Hidden native input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
                className="hidden"
                disabled={disabled || isUploading}
                onChange={handleInputChange}
            />

            {/* If an image is already uploaded or exists */}
            {value ? (
                <div className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-2">
                    <div className="relative w-full h-56 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <img
                            src={value}
                            alt="Ürün Görseli"
                            className="w-full h-full object-contain"
                        />
                        {isUploading && (
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-2">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                <span className="text-sm font-medium">Yeni görsel yükleniyor...</span>
                            </div>
                        )}
                    </div>

                    {/* Action bar below preview */}
                    <div className="mt-3 flex items-center justify-between gap-2 px-1">
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                size="xs"
                                variant="default"
                                icon={<RefreshCw className="w-3.5 h-3.5" />}
                                onClick={() => fileInputRef.current?.click()}
                                disabled={disabled || isUploading}
                            >
                                Değiştir
                            </Button>
                            <a
                                href={value}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                                <ExternalLink className="w-3 h-3" />
                                <span>Görüntüle</span>
                            </a>
                        </div>

                        <Button
                            type="button"
                            size="xs"
                            variant="default"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-900/50"
                            icon={<Trash2 className="w-3.5 h-3.5" />}
                            onClick={handleRemoveImage}
                            disabled={disabled || isUploading}
                        >
                            Kaldır
                        </Button>
                    </div>
                </div>
            ) : (
                /* Dropzone Area */
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => !isUploading && !disabled && fileInputRef.current?.click()}
                    className={`
                        relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
                        transition-all duration-200 flex flex-col items-center justify-center gap-3
                        ${isDragging
                            ? 'border-primary bg-primary/5 scale-[0.99]'
                            : 'border-gray-300 dark:border-gray-700 hover:border-primary/60 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                        }
                        ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
                    `}
                >
                    {isUploading ? (
                        <div className="flex flex-col items-center gap-2 py-4">
                            <Loader2 className="w-10 h-10 animate-spin text-primary" />
                            <p className="text-sm font-medium text-foreground">
                                Görsel yükleniyor...
                            </p>
                            <p className="text-xs text-muted-foreground">Lütfen bekleyin</p>
                        </div>
                    ) : (
                        <>
                            <div className="w-14 h-14 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary transition-transform group-hover:scale-110">
                                <UploadCloud className="w-7 h-7" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-semibold text-foreground">
                                    Resim yüklemek için tıklayın veya sürükleyip bırakın
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    PNG, JPG, WEBP, GIF, AVIF (Maks. 10MB)
                                </p>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
export default ProductImageUpload;
