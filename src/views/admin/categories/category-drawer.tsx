'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';

import { Button, Drawer, Input } from '@/components/ui';
import { FormContainer, FormItem } from '@/components/ui/Form';
import Upload from '@/components/ui/Upload';

import { categorySchema, type CategoryFormData } from '@/lib/validations';
import type { Category } from '@/types';

interface CategoryDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (data: CategoryFormData) => Promise<void>;
    category?: Category;
    menuId: string;
}

export function CategoryDrawer({
    open,
    onOpenChange,
    onSave,
    category,
    menuId,
}: CategoryDrawerProps) {
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm<CategoryFormData>({
        resolver: zodResolver(categorySchema),
        defaultValues: {
            name: '',
            description: '',
            menuId,
            imageUrl: '',
        },
    });

    // Reset form when category changes
    useEffect(() => {
        if (category) {
            form.reset({
                name: category.name,
                description: category.description || '',
                menuId: category.menuId,
                imageUrl: category.imageUrl || '',
            });
        } else {
            form.reset({
                name: '',
                description: '',
                menuId,
                imageUrl: '',
            });
        }
    }, [category, menuId, form]);

    async function onSubmit(data: CategoryFormData) {
        setIsSaving(true);
        try {
            await onSave(data);
            form.reset();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    }

    const Footer = (
        <div className='bg-background mt-auto flex justify-end space-x-2 w-full'>
            <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
            >
                İptal
            </Button>
            <Button
                type="submit"
                form="category-form"
                variant='solid'
                size="sm"
                loading={isSaving}
            >
                {category
                    ? 'Değişiklikleri Kaydet'
                    : 'Kategori Oluştur'
                }
            </Button>
        </div>
    );

    const Title = (
        <div className='flex flex-col gap-1.5'>
            <h2 className='text-foreground font-semibold text-lg'>
                {category ? 'Kategoriyi Düzenle' : 'Yeni Kategori Oluştur'}
            </h2>
            <div className='text-muted-foreground text-sm'>
                {category
                    ? 'Kategori bilgilerini güncelleyin.'
                    : 'Menüye yeni bir kategori ekleyin.'
                }
            </div>
        </div>
    );

    return (
        <Drawer
            placement='right'
            title={Title}
            isOpen={open}
            footer={Footer}
            onClose={() => onOpenChange(false)}
            onRequestClose={() => onOpenChange(false)}
        >
            <div className="flex-1 overflow-y-auto p-0.5">
                <FormContainer>
                    <form id="category-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {/* Image Upload */}
                        <Controller
                            name="imageUrl"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <FormItem
                                    label="Kategori Görseli"
                                    invalid={Boolean(fieldState.error)}
                                    errorMessage={fieldState.error?.message}
                                >
                                    <Upload
                                        accept="image/*"
                                        fileList={field.value ? [new File([], 'image.png')] : []}
                                        onChange={(files) => {
                                            if (files.length > 0) {
                                                field.onChange(files[0]);
                                            } else {
                                                field.onChange('');
                                            }
                                        }}
                                        draggable
                                    >
                                        <div className="text-center p-4">
                                            <p>Görsel Seç veya Sürükle Bırak</p>
                                        </div>
                                    </Upload>
                                </FormItem>
                            )}
                        />

                        <Controller
                            name="name"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <FormItem
                                    label="Kategori Adı"
                                    invalid={Boolean(fieldState.error)}
                                    errorMessage={fieldState.error?.message}
                                >
                                    <Input placeholder="Örn: Çorbalar" {...field} />
                                </FormItem>
                            )}
                        />

                        <Controller
                            name="description"
                            control={form.control}
                            render={({ field, fieldState }) => (
                                <FormItem
                                    label="Açıklama (Opsiyonel)"
                                    extra="Kategori için kısa bir açıklama"
                                    invalid={Boolean(fieldState.error)}
                                    errorMessage={fieldState.error?.message}
                                >
                                    <Input
                                        textArea
                                        placeholder="Geleneksel Türk çorbaları"
                                        {...field}
                                        value={field.value || ''}
                                    />
                                </FormItem>
                            )}
                        />
                    </form>
                </FormContainer>
            </div>
        </Drawer>
    );
}
