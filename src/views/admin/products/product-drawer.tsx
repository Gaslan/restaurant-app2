'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Drawer, Input, FormContainer, FormItem } from '@/components/ui';
import { Controller } from 'react-hook-form';
import { MultiSelect, type Option } from '@/components/shared/MultiSelect';
import { Switcher } from '@/components/ui';
import { ProductImageUpload } from './components/product-image-upload';

import { productSchema, type ProductFormData } from '@/lib/validations';
import { z } from 'zod';

// Form schema with availabilityHours for UI state
const formSchema = productSchema.omit({ presence: true }).extend({
    availabilityHours: z.array(z.object({
        day: z.string(),
        label: z.string(),
        isOpen: z.boolean(),
        openTime: z.string(),
        closeTime: z.string(),
    })),
});

type FormSchemaType = z.infer<typeof formSchema>;
import {
    ProductTag,
    type Product,
    VARIATION_TYPES,
    TAG_CONFIG,
    ALLERGEN_OPTIONS,
    CONTENT_WARNING_OPTIONS,
    PRIMARY_PRODUCT_TAGS,
    DIETARY_PRODUCT_TAGS,
} from '@/types';

// Options for 14 mandatory allergens (Turkish Food Codex)
const allergenOptions: Option[] = ALLERGEN_OPTIONS.map((item) => ({
    label: `${item.icon ? item.icon + ' ' : ''}${item.label}`,
    value: item.value,
}));

// Options for content warnings (Turkish Food Codex & International standards)
const contentWarningOptions: Option[] = CONTENT_WARNING_OPTIONS.map((item) => ({
    label: `${item.icon ? item.icon + ' ' : ''}${item.label}`,
    value: item.value,
}));

const daysOfWeek = [
    { value: 'mon', label: 'Pazartesi' },
    { value: 'tue', label: 'Salı' },
    { value: 'wed', label: 'Çarşamba' },
    { value: 'thu', label: 'Perşembe' },
    { value: 'fri', label: 'Cuma' },
    { value: 'sat', label: 'Cumartesi' },
    { value: 'sun', label: 'Pazar' },
] as const;

interface ProductDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (data: ProductFormData) => Promise<void>;
    product?: Product;
    categoryId: string;
}

export function ProductDrawer({
    open,
    onOpenChange,
    onSave,
    product,
    categoryId,
}: ProductDrawerProps) {
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm<FormSchemaType>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            description: '',
            price: 0,
            calories: 0,
            cookingTime: 0,
            imageUrl: '',
            categoryId: categoryId,
            tags: [],
            allergens: [],
            contentWarnings: [],
            available: true,
            active: true,
            variations: [],
            discount: {
                enabled: false,
                discountedPrice: 0,
                hasSchedule: false,
                startDate: '',
                endDate: '',
                startTime: '',
                endTime: '',
                days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
            },
            availabilityHours: daysOfWeek.map(day => ({
                day: day.value,
                label: day.label,
                isOpen: true,
                openTime: '00:00',
                closeTime: '23:59',
            })),
        },
    });

    const { fields } = useFieldArray({
        control: form.control,
        name: 'availabilityHours',
    });

    const { fields: variationFields, append: appendVariation, remove: removeVariation } = useFieldArray({
        control: form.control,
        name: 'variations',
    });

    // Reset form when product changes
    useEffect(() => {
        if (open) {
            const availabilityHours = daysOfWeek.map(day => {
                const times = product?.presence?.[day.value];
                // If presence is undefined, default to open. If times exists, check if it has start/end.
                const isOpen = product?.presence ? (!!times && times.length === 2) : true;
                return {
                    day: day.value,
                    label: day.label,
                    isOpen,
                    openTime: isOpen && times ? times[0] : '00:00',
                    closeTime: isOpen && times ? times[1] : '23:59',
                };
            });

            form.reset({
                name: product?.name || '',
                description: product?.description || '',
                price: product?.price || 0,
                imageUrl: product?.imageUrl || '',
                categoryId: categoryId || product?.categoryId || '',
                tags: product?.tags || [],
                allergens: product?.allergens || [],
                contentWarnings: product?.contentWarnings || [],
                available: product?.available ?? true,
                active: product?.active ?? true,
                calories: product?.calories || 0,
                cookingTime: product?.cookingTime || 0,
                availabilityHours: availabilityHours,
                variations: product?.variations || [],
                discount: product?.discount ? {
                    enabled: product.discount.enabled ?? false,
                    discountedPrice: product.discount.discountedPrice ?? 0,
                    hasSchedule: product.discount.hasSchedule ?? false,
                    startDate: product.discount.startDate ?? '',
                    endDate: product.discount.endDate ?? '',
                    startTime: product.discount.startTime ?? '',
                    endTime: product.discount.endTime ?? '',
                    days: product.discount.days ?? ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
                } : {
                    enabled: false,
                    discountedPrice: 0,
                    hasSchedule: false,
                    startDate: '',
                    endDate: '',
                    startTime: '',
                    endTime: '',
                    days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
                },
            });
        }
    }, [open, product, categoryId, form]);

    async function onSubmit(data: FormSchemaType) {
        setIsSaving(true);
        try {
            // Transform UI form data to domain model
            const presence: Record<string, string[]> = {};
            let hasCustomPresence = false;

            data.availabilityHours.forEach(day => {
                if (day.isOpen) {
                    presence[day.day] = [day.openTime, day.closeTime];
                    // Check if this day differs from default (open 00:00-23:59)
                    if (day.openTime !== '00:00' || day.closeTime !== '23:59') {
                        hasCustomPresence = true;
                    }
                } else {
                    presence[day.day] = [];
                    // If a day is closed, it's a custom presence configuration
                    hasCustomPresence = true;
                }
            });

            const productData: ProductFormData = {
                name: data.name,
                description: data.description,
                price: data.price,
                imageUrl: data.imageUrl,
                categoryId: data.categoryId,
                tags: data.tags,
                allergens: data.allergens,
                contentWarnings: data.contentWarnings,
                available: data.available,
                active: data.active,
                variations: data.variations,
                discount: data.discount?.enabled ? {
                    enabled: true,
                    discountedPrice: data.discount.discountedPrice,
                    hasSchedule: data.discount.hasSchedule ?? false,
                    ...(data.discount.hasSchedule ? {
                        startDate: data.discount.startDate || undefined,
                        endDate: data.discount.endDate || undefined,
                        startTime: data.discount.startTime || undefined,
                        endTime: data.discount.endTime || undefined,
                        days: data.discount.days || undefined,
                    } : {}),
                } : undefined,
                calories: data.calories,
                cookingTime: data.cookingTime,
                // Only include presence if there are custom settings
                ...(hasCustomPresence ? { presence } : {}),
            };

            await onSave(productData);
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
                form="product-form"
                variant='solid'
                size="sm"
                loading={isSaving}
            >
                {product
                    ? 'Değişiklikleri Kaydet'
                    : 'Ürün Oluştur'
                }
            </Button>
        </div>
    );

    const Title = (
        <div className='flex flex-col gap-1.5'>
            <h2 className='text-foreground font-semibold text-lg'>
                {product ? 'Ürünü Düzenle' : 'Yeni Ürün Oluştur'}
            </h2>
            <div className='text-muted-foreground text-sm'>
                {product
                    ? 'Ürün bilgilerini güncelleyin.'
                    : 'Kategoriye yeni bir ürün ekleyin.'
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
            width={600}
        >
            <div className="flex-1 overflow-y-auto p-0.5">
                <FormContainer>
                    <form id="product-form" onSubmit={form.handleSubmit(onSubmit, (errors) => console.error("Form errors:", errors))} className="space-y-8 pb-6">
                        {/* 1. Genel */}
                        <div className="space-y-4">
                            <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                                <h3 className="text-lg font-semibold text-foreground">Genel</h3>
                            </div>

                            <Controller
                                name="name"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <FormItem
                                        label="Ürün Adı"
                                        invalid={Boolean(fieldState.error)}
                                        errorMessage={fieldState.error?.message}
                                    >
                                        <Input placeholder="Mercimek Çorbası" {...field} />
                                    </FormItem>
                                )}
                            />

                            <Controller
                                name="description"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <FormItem
                                        label="Açıklama (Opsiyonel)"
                                        invalid={Boolean(fieldState.error)}
                                        errorMessage={fieldState.error?.message}
                                    >
                                        <Input
                                            textArea
                                            placeholder="Geleneksel kırmızı mercimek çorbası"
                                            {...field}
                                            value={field.value || ''}
                                        />
                                    </FormItem>
                                )}
                            />

                            <div className="pt-1">
                                <Controller
                                    name="available"
                                    control={form.control}
                                    render={({ field }) => (
                                        <div className="flex flex-row items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                            <div className="space-y-0.5 pr-4">
                                                <div className="font-semibold text-foreground text-sm">
                                                    Müsaitlik Durumu
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    Ürün stokta varsa açık konuma getirin.
                                                </p>
                                            </div>
                                            <Switcher
                                                className="shrink-0"
                                                checked={field.value}
                                                onChange={(checked: boolean) => field.onChange(checked)}
                                            />
                                        </div>
                                    )}
                                />
                            </div>
                        </div>

                        {/* 2. Medya */}
                        <div className="space-y-4">
                            <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                                <h3 className="text-lg font-semibold text-foreground">Medya</h3>
                            </div>

                            <Controller
                                name="imageUrl"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <FormItem
                                        label="Ürün Görseli"
                                        invalid={Boolean(fieldState.error)}
                                        errorMessage={fieldState.error?.message}
                                    >
                                        <ProductImageUpload
                                            value={field.value}
                                            onChange={(url) => field.onChange(url)}
                                        />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* 3. Fiyat */}
                        <div className="space-y-4">
                            <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                                <h3 className="text-lg font-semibold text-foreground">Fiyat</h3>
                            </div>

                            <Controller
                                name="price"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <FormItem
                                        label="Fiyat"
                                        invalid={Boolean(fieldState.error)}
                                        errorMessage={fieldState.error?.message}
                                    >
                                        <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="45.00"
                                            {...field}
                                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                        />
                                    </FormItem>
                                )}
                            />

                            {/* İndirimli Fiyat Seçeneği & Planlaması */}
                            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/20 p-4 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5 pr-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-base">🏷️</span>
                                            <span className="font-semibold text-foreground text-sm">
                                                İndirimli Fiyat Uygula
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Ürünün indirimde olduğunu belirtin ve özel indirimli fiyat tanımlayın.
                                        </p>
                                    </div>
                                    <Controller
                                        name="discount.enabled"
                                        control={form.control}
                                        render={({ field }) => (
                                            <Switcher
                                                className="shrink-0"
                                                checked={Boolean(field.value)}
                                                onChange={(checked: boolean) => field.onChange(checked)}
                                            />
                                        )}
                                    />
                                </div>

                                {form.watch('discount.enabled') && (
                                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700 space-y-4">
                                        {/* İndirimli Fiyat Input & Hesaplanan İndirim Oranı */}
                                        <Controller
                                            name="discount.discountedPrice"
                                            control={form.control}
                                            render={({ field, fieldState }) => {
                                                const currentPrice = form.watch('price') || 0;
                                                const discPrice = field.value || 0;
                                                const isLower = currentPrice > 0 && discPrice > 0 && discPrice < currentPrice;
                                                const discountPercent = isLower ? Math.round(((currentPrice - discPrice) / currentPrice) * 100) : 0;
                                                const saving = isLower ? (currentPrice - discPrice).toFixed(2) : '0';

                                                return (
                                                    <FormItem
                                                        label="İndirimli Satış Fiyatı"
                                                        invalid={Boolean(fieldState.error) || (discPrice >= currentPrice && discPrice > 0 && currentPrice > 0)}
                                                        errorMessage={
                                                            fieldState.error?.message ||
                                                            (discPrice >= currentPrice && discPrice > 0 && currentPrice > 0
                                                                ? 'İndirimli fiyat normal satış fiyatından düşük olmalıdır.'
                                                                : undefined)
                                                        }
                                                        extra={
                                                            isLower ? (
                                                                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                                                                    <span>🎉 %{discountPercent} İndirim</span>
                                                                    <span>•</span>
                                                                    <span>{saving} ₺ kazanç</span>
                                                                </span>
                                                            ) : undefined
                                                        }
                                                    >
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            placeholder="35.00"
                                                            {...field}
                                                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                        />
                                                    </FormItem>
                                                );
                                            }}
                                        />

                                        {/* Zaman Kısıtlaması / Planlama Switcher */}
                                        <div className="pt-2 border-t border-gray-200/70 dark:border-gray-700/70">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="space-y-0.5">
                                                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                                        <span>⏰</span>
                                                        <span>Zaman Aralığı Belirle (Opsiyonel)</span>
                                                    </span>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        İndirimin yalnızca belirli tarihler, günler veya saatler (ör. Happy Hour) arasında geçerli olmasını sağlayın.
                                                    </p>
                                                </div>
                                                <Controller
                                                    name="discount.hasSchedule"
                                                    control={form.control}
                                                    render={({ field }) => (
                                                        <Switcher
                                                            className="shrink-0 scale-90"
                                                            checked={Boolean(field.value)}
                                                            onChange={(checked: boolean) => field.onChange(checked)}
                                                        />
                                                    )}
                                                />
                                            </div>

                                            {form.watch('discount.hasSchedule') && (
                                                <div className="p-3 bg-background rounded-lg border border-gray-200 dark:border-gray-700 space-y-3 mt-2">
                                                    {/* Tarih Aralığı */}
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <Controller
                                                            name="discount.startDate"
                                                            control={form.control}
                                                            render={({ field }) => (
                                                                <FormItem label="Başlangıç Tarihi">
                                                                    <Input
                                                                        type="date"
                                                                        {...field}
                                                                        value={field.value || ''}
                                                                    />
                                                                </FormItem>
                                                            )}
                                                        />
                                                        <Controller
                                                            name="discount.endDate"
                                                            control={form.control}
                                                            render={({ field }) => (
                                                                <FormItem label="Bitiş Tarihi">
                                                                    <Input
                                                                        type="date"
                                                                        {...field}
                                                                        value={field.value || ''}
                                                                    />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>

                                                    {/* Saat Aralığı */}
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <Controller
                                                            name="discount.startTime"
                                                            control={form.control}
                                                            render={({ field }) => (
                                                                <FormItem label="Başlangıç Saati">
                                                                    <Input
                                                                        type="time"
                                                                        {...field}
                                                                        value={field.value || ''}
                                                                    />
                                                                </FormItem>
                                                            )}
                                                        />
                                                        <Controller
                                                            name="discount.endTime"
                                                            control={form.control}
                                                            render={({ field }) => (
                                                                <FormItem label="Bitiş Saati">
                                                                    <Input
                                                                        type="time"
                                                                        {...field}
                                                                        value={field.value || ''}
                                                                    />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>

                                                    {/* Günler Seçimi */}
                                                    <div>
                                                        <label className="text-xs font-medium text-foreground block mb-1.5">
                                                            Geçerli Günler
                                                        </label>
                                                        <Controller
                                                            name="discount.days"
                                                            control={form.control}
                                                            render={({ field }) => {
                                                                const currentDays = field.value || [];
                                                                const toggleDay = (dayVal: string) => {
                                                                    if (currentDays.includes(dayVal)) {
                                                                        field.onChange(currentDays.filter((d: string) => d !== dayVal));
                                                                    } else {
                                                                        field.onChange([...currentDays, dayVal]);
                                                                    }
                                                                };

                                                                return (
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {daysOfWeek.map((day) => {
                                                                            const isSelected = currentDays.includes(day.value);
                                                                            return (
                                                                                <button
                                                                                    key={day.value}
                                                                                    type="button"
                                                                                    onClick={() => toggleDay(day.value)}
                                                                                    className={`px-2 py-1 text-xs rounded-md border font-medium transition-colors ${
                                                                                        isSelected
                                                                                            ? 'bg-primary text-primary-foreground border-primary'
                                                                                            : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted'
                                                                                    }`}
                                                                                >
                                                                                    {day.label.slice(0, 3)}
                                                                                </button>
                                                                            );
                                                                        })}
                                                                    </div>
                                                                );
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h6 className="text-base font-semibold">Fiyat Varyasyonları</h6>
                                        <span className="text-sm text-gray-500">Porsiyon, boy veya gramaj seçenekleri ekleyin</span>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="plain"
                                        size="sm"
                                        onClick={() => appendVariation({ type: 'porsiyon', unit: '', price: 0 })}
                                    >
                                        + Varyasyon Ekle
                                    </Button>
                                </div>

                                <div className="space-y-4">
                                    {variationFields.map((field, index) => (
                                        <div key={field.id} className="relative grid grid-cols-1 sm:grid-cols-12 gap-4 items-start border p-4 rounded-lg bg-card">
                                            {/* Type Selection */}
                                            <div className="sm:col-span-3">
                                                <Controller
                                                    name={`variations.${index}.type`}
                                                    control={form.control}
                                                    render={({ field, fieldState }) => (
                                                        <FormItem
                                                            label="Tip"
                                                            invalid={Boolean(fieldState.error)}
                                                            errorMessage={fieldState.error?.message}
                                                        >
                                                            <select
                                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                                {...field}
                                                                onChange={(e) => {
                                                                    field.onChange(e);
                                                                    // Reset unit when type changes to avoid invalid states
                                                                    form.setValue(`variations.${index}.unit`, '');
                                                                }}
                                                            >
                                                                {VARIATION_TYPES.map((type) => (
                                                                    <option key={type.value} value={type.value}>
                                                                        {type.label}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>

                                            {/* Unit Input - Dynamic based on Type */}
                                            <div className="sm:col-span-5">
                                                <Controller
                                                    name={`variations.${index}.unit`}
                                                    control={form.control}
                                                    render={({ field, fieldState }) => {
                                                        const type = form.watch(`variations.${index}.type`);

                                                        if (type === 'porsiyon') {
                                                            return (
                                                                <FormItem
                                                                    label="Birim"
                                                                    invalid={Boolean(fieldState.error)}
                                                                    errorMessage={fieldState.error?.message}
                                                                >
                                                                    <select
                                                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                                        {...field}
                                                                    >
                                                                        <option value="" disabled>Seçiniz</option>
                                                                        <option value="Tam">Tam</option>
                                                                        <option value="Yarım">Yarım</option>
                                                                        <option value="Bir Buçuk">Bir Buçuk</option>
                                                                        <option value="Duble">Duble</option>
                                                                    </select>
                                                                </FormItem>
                                                            );
                                                        }

                                                        if (type === 'boy') {
                                                            return (
                                                                <FormItem
                                                                    label="Birim"
                                                                    invalid={Boolean(fieldState.error)}
                                                                    errorMessage={fieldState.error?.message}
                                                                >
                                                                    <select
                                                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                                        {...field}
                                                                    >
                                                                        <option value="" disabled>Seçiniz</option>
                                                                        <option value="Küçük">Küçük</option>
                                                                        <option value="Orta">Orta</option>
                                                                        <option value="Büyük">Büyük</option>
                                                                    </select>
                                                                </FormItem>
                                                            );
                                                        }

                                                        // Default input for 'gramaj', 'adet', 'ozel'
                                                        return (
                                                            <FormItem
                                                                label="Değer"
                                                                invalid={Boolean(fieldState.error)}
                                                                errorMessage={fieldState.error?.message}
                                                            >
                                                                <Input
                                                                    placeholder={type === 'gramaj' ? '150g' : type === 'adet' ? '10 Adet' : 'Özel değer'}
                                                                    {...field}
                                                                />
                                                            </FormItem>
                                                        );
                                                    }}
                                                />
                                            </div>

                                            {/* Price Input */}
                                            <div className="sm:col-span-3">
                                                <Controller
                                                    name={`variations.${index}.price`}
                                                    control={form.control}
                                                    render={({ field, fieldState }) => (
                                                        <FormItem
                                                            label="Fiyat"
                                                            invalid={Boolean(fieldState.error)}
                                                            errorMessage={fieldState.error?.message}
                                                        >
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                placeholder="0.00"
                                                                {...field}
                                                                onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                                            />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>

                                            {/* Delete Button */}
                                            <div className="absolute top-2 right-2 sm:static sm:col-span-1 sm:pt-6 sm:flex sm:justify-center">
                                                <Button
                                                    type="button"
                                                    variant="plain"
                                                    className="h-8 w-8 text-destructive hover:text-destructive/90 p-1 flex items-center justify-center"
                                                    onClick={() => removeVariation(index)}
                                                >
                                                    <span className="sr-only">Sil</span>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></svg>
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                    {variationFields.length === 0 && (
                                        <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                                            Henüz varyasyon eklenmedi.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 4. Özellikler */}
                        <div className="space-y-4">
                            <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                                <h3 className="text-lg font-semibold text-foreground">Özellikler</h3>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Controller
                                    name="cookingTime"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <FormItem
                                            label="Pişirme Süresi (dk)"
                                            invalid={Boolean(fieldState.error)}
                                            errorMessage={fieldState.error?.message}
                                        >
                                            <Input
                                                type="number"
                                                placeholder="20"
                                                {...field}
                                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                            />
                                        </FormItem>
                                    )}
                                />

                                <Controller
                                    name="calories"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <FormItem
                                            label="Kalori (kcal)"
                                            invalid={Boolean(fieldState.error)}
                                            errorMessage={fieldState.error?.message}
                                        >
                                            <Input
                                                type="number"
                                                placeholder="350"
                                                {...field}
                                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                            />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Alerjenler (Türk Gıda Kodeksi 14 Zorunlu Alerjen) */}
                            <Controller
                                name="allergens"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <FormItem
                                        label="Alerjenler"
                                        extra="Türk Gıda Kodeksi ve restoran menü yönetmeliğine uygun 14 temel alerjen listesi."
                                        invalid={Boolean(fieldState.error)}
                                        errorMessage={fieldState.error?.message}
                                    >
                                        <MultiSelect
                                            options={allergenOptions}
                                            value={field.value || []}
                                            onChange={field.onChange}
                                            placeholder="Alerjenleri seçin veya arayın..."
                                        />
                                    </FormItem>
                                )}
                            />

                            {/* İçerik Uyarıları (Türk Gıda Kodeksi & Dünya Standartları) */}
                            <Controller
                                name="contentWarnings"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <FormItem
                                        label="İçerik Uyarıları"
                                        extra="Türk Gıda Kodeksi ve uluslararası standartlara uygun içerik uyarıları (Alkol, domuz mamulü, tatlandırıcı vb.)."
                                        invalid={Boolean(fieldState.error)}
                                        errorMessage={fieldState.error?.message}
                                    >
                                        <MultiSelect
                                            options={contentWarningOptions}
                                            value={field.value || []}
                                            onChange={field.onChange}
                                            placeholder="İçerik uyarılarını seçin veya arayın..."
                                        />
                                    </FormItem>
                                )}
                            />

                            {/* Etiketler */}
                            <Controller
                                name="tags"
                                control={form.control}
                                render={({ field }) => {
                                    const currentTags = field.value || [];
                                    const toggleTag = (tag: ProductTag) => {
                                        if (currentTags.includes(tag)) {
                                            field.onChange(currentTags.filter((t: ProductTag) => t !== tag));
                                        } else {
                                            field.onChange([...currentTags, tag]);
                                        }
                                    };

                                    return (
                                        <FormItem
                                            label="Etiketler"
                                            extra="Ürün kartlarında öne çıkarılacak etiketleri seçin."
                                        >
                                            <div className="space-y-3 mt-1.5">
                                                {/* Ana Vitrin Etiketleri (Popüler, Öne Çıkan, Şefin Tavsiyesi, Yeni) */}
                                                <div className="grid grid-cols-2 gap-2.5">
                                                    {PRIMARY_PRODUCT_TAGS.map((tag) => {
                                                        const config = TAG_CONFIG[tag];
                                                        const isSelected = currentTags.includes(tag);
                                                        return (
                                                            <button
                                                                key={tag}
                                                                type="button"
                                                                onClick={() => toggleTag(tag)}
                                                                className={`flex items-center gap-2.5 p-3 rounded-xl border text-sm font-medium transition-all text-left ${
                                                                    isSelected
                                                                        ? 'border-primary bg-primary/10 text-primary shadow-xs ring-2 ring-primary/20 font-semibold'
                                                                        : 'border-gray-200 dark:border-gray-700 bg-background text-foreground/80 hover:bg-gray-50 dark:hover:bg-gray-800'
                                                                }`}
                                                            >
                                                                <span className="text-xl shrink-0">{config.icon}</span>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="leading-tight truncate">{config.label}</div>
                                                                </div>
                                                                <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                                                    isSelected
                                                                        ? 'border-primary bg-primary text-white'
                                                                        : 'border-gray-300 dark:border-gray-600'
                                                                }`}>
                                                                    {isSelected && (
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                                            <polyline points="20 6 9 17 4 12"></polyline>
                                                                        </svg>
                                                                    )}
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                {/* Diyet & Diğer Tercih Etiketleri */}
                                                <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                                                    <span className="text-xs font-medium text-muted-foreground block mb-2">
                                                        Diyet ve Özellik Etiketleri
                                                    </span>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {DIETARY_PRODUCT_TAGS.map((tag) => {
                                                            const config = TAG_CONFIG[tag];
                                                            const isSelected = currentTags.includes(tag);
                                                            return (
                                                                <button
                                                                    key={tag}
                                                                    type="button"
                                                                    onClick={() => toggleTag(tag)}
                                                                    className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                                                                        isSelected
                                                                            ? 'border-primary bg-primary/15 text-primary font-semibold'
                                                                            : 'border-gray-200 dark:border-gray-700 bg-card text-muted-foreground hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-foreground'
                                                                    }`}
                                                                >
                                                                    <span>{config.icon}</span>
                                                                    <span>{config.label}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        </FormItem>
                                    );
                                }}
                            />
                        </div>

                        {/* 5. Görünürlük */}
                        <div className="space-y-4">
                            <div className="border-b border-gray-200 dark:border-gray-700 pb-2">
                                <h3 className="text-lg font-semibold text-foreground">Görünürlük</h3>
                            </div>

                            <Controller
                                name="active"
                                control={form.control}
                                render={({ field }) => (
                                    <div className="flex flex-row items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                                        <div className="space-y-0.5 pr-4">
                                            <div className="font-semibold text-foreground text-sm">
                                                Görünürlük
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Ürünün menüde görünmesini istiyorsanız açık konuma getirin.
                                            </p>
                                        </div>
                                        <Switcher
                                            className="shrink-0"
                                            checked={field.value}
                                            onChange={(checked: boolean) => field.onChange(checked)}
                                        />
                                    </div>
                                )}
                            />

                            <div className="pt-2">
                                <div className="mb-4">
                                    <h6 className="text-base block mb-1">Müsaitlik Saatleri</h6>
                                    <p className="text-sm text-muted-foreground">
                                        Ürünün sipariş verilebileceği saatleri belirleyin
                                    </p>
                                </div>
                                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-4">
                                    {fields.map((field, index) => (
                                        <div key={field.id} className="flex flex-col sm:flex-row sm:items-center gap-4 py-2 border-b last:border-0 border-border/50">
                                            <div className="w-36 font-medium flex items-center gap-2.5 shrink-0">
                                                <Controller
                                                    name={`availabilityHours.${index}.isOpen`}
                                                    control={form.control}
                                                    render={({ field }) => (
                                                        <Switcher
                                                            className="shrink-0"
                                                            checked={field.value}
                                                            onChange={(checked: boolean) => field.onChange(checked)}
                                                        />
                                                    )}
                                                />
                                                <span className="text-sm">{field.label}</span>
                                            </div>

                                            {form.watch(`availabilityHours.${index}.isOpen`) ? (
                                                <div className="flex items-center gap-2 flex-1">
                                                    <Controller
                                                        name={`availabilityHours.${index}.openTime`}
                                                        control={form.control}
                                                        render={({ field }) => (
                                                            <Input type="time" {...field} className="h-8 w-24" />
                                                        )}
                                                    />
                                                    <span className="text-slate-500">-</span>
                                                    <Controller
                                                        name={`availabilityHours.${index}.closeTime`}
                                                        control={form.control}
                                                        render={({ field }) => (
                                                            <Input type="time" {...field} className="h-8 w-24" />
                                                        )}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="text-muted-foreground text-sm italic">Kapalı</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </form>
                </FormContainer>
            </div>
        </Drawer>
    );
}
