'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';

import { Button, Drawer, Input, FormContainer, FormItem } from '@/components/ui';
import { Controller } from 'react-hook-form';
import { Checkbox } from '@/components/ui';
import { Badge } from '@/components/ui';
import { MultiSelect, type Option } from '@/components/shared/MultiSelect';
import { Tabs } from '@/components/ui';
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
import { ProductTag, type Product, VARIATION_TYPES, TAG_CONFIG } from '@/types';

// Transform ingredient warnings to options (mocked for now as data is missing)
const allergenOptions: Option[] = [
    { label: 'Süt Ürünleri', value: 'dairy' },
    { label: 'Gluten', value: 'gluten' },
    { label: 'Kuruyemiş', value: 'nuts' },
];

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
            available: true,
            active: true,
            variations: [],
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

    const [activeTab, setActiveTab] = useState("genel");

    // Reset form when product changes
    useEffect(() => {
        if (open) {
            setActiveTab("genel");
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
                available: product?.available ?? true,
                active: product?.active ?? true,
                calories: product?.calories || 0,
                cookingTime: product?.cookingTime || 0,
                availabilityHours: availabilityHours,
                variations: product?.variations || [],
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
                available: data.available,
                active: data.active,
                variations: data.variations,
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

    const availableTags = Object.values(ProductTag);

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
                    <form id="product-form" onSubmit={form.handleSubmit(onSubmit, (errors) => console.error("Form errors:", errors))} className="space-y-4">
                        <Tabs defaultValue={activeTab} onChange={setActiveTab} className="w-full">
                            <Tabs.TabList className="grid w-full grid-cols-5 mb-4">
                                <Tabs.TabNav value="genel">Genel</Tabs.TabNav>
                                <Tabs.TabNav value="ozellikler">Özellikler</Tabs.TabNav>
                                <Tabs.TabNav value="medya">Medya</Tabs.TabNav>
                                <Tabs.TabNav value="fiyat">Fiyat & Varyasyon</Tabs.TabNav>
                                <Tabs.TabNav value="gorunurluk">Görünürlük</Tabs.TabNav>
                            </Tabs.TabList>

                            <Tabs.TabContent value="genel" className="space-y-4">
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

                                <div className="space-y-4 pt-2">
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
                                                    <span
                                                        className="text-primary hover:underline cursor-pointer text-xs block pt-0.5"
                                                        onClick={() => setActiveTab("gorunurluk")}
                                                    >
                                                        Detaylı görünürlük ayarları için tıklayın
                                                    </span>
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
                            </Tabs.TabContent>

                            <Tabs.TabContent value="ozellikler" className="space-y-4">
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

                                <Controller
                                    name="allergens"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <FormItem
                                            label="İçerik Uyarıları"
                                            extra="Ürünün içerdiği alerjenleri veya uyarıları seçin."
                                            invalid={Boolean(fieldState.error)}
                                            errorMessage={fieldState.error?.message}
                                        >
                                            <MultiSelect
                                                options={allergenOptions}
                                                value={field.value || []}
                                                onChange={field.onChange}
                                                placeholder="İçerik uyarılarını seçin..."
                                            />
                                        </FormItem>
                                    )}
                                />

                                <Controller
                                    name="tags"
                                    control={form.control}
                                    render={() => (
                                        <FormItem
                                            label="Etiketler"
                                            extra="Ürün için uygun etiketleri seçin"
                                        >
                                            <div className="grid grid-cols-2 gap-3 mt-2">
                                                {availableTags.map((tag) => {
                                                    const config = TAG_CONFIG[tag];
                                                    return (
                                                        <Controller
                                                            key={tag}
                                                            name="tags"
                                                            control={form.control}
                                                            render={({ field }) => {
                                                                return (
                                                                    <div className="flex flex-row items-center space-x-3 space-y-0 mb-2">
                                                                        <Checkbox
                                                                            checked={field.value?.includes(tag)}
                                                                            onChange={(val, e) => {
                                                                                const checked = e.target.checked;
                                                                                const currentTags = field.value || [];
                                                                                return checked
                                                                                    ? field.onChange([...currentTags, tag])
                                                                                    : field.onChange(
                                                                                        currentTags.filter((value: string) => value !== tag)
                                                                                    );
                                                                            }}
                                                                        />
                                                                        <label className="font-normal cursor-pointer text-sm">
                                                                            {/* <Badge variant="outline" className={`${config.color} border`}> */}
                                                                            <span>
                                                                                <span className="mr-1">{config.icon}</span>
                                                                                {config.label}
                                                                            </span>
                                                                            {/* </Badge> */}
                                                                        </label>
                                                                    </div>
                                                                );
                                                            }}
                                                        />
                                                    );
                                                })}
                                            </div>
                                        </FormItem>
                                    )}
                                />
                            </Tabs.TabContent>

                            <Tabs.TabContent value="medya" className="space-y-4">
                                <Controller
                                    name="imageUrl"
                                    control={form.control}
                                    render={({ field, fieldState }) => (
                                        <FormItem
                                            label="Ürün Görseli"
                                            extra="Ürününüz için bir görsel yükleyin."
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
                            </Tabs.TabContent>

                            <Tabs.TabContent value="fiyat">
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 gap-4">
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
                                    </div>

                                    <div className="border-t pt-4">
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
                            </Tabs.TabContent>

                            <Tabs.TabContent value="gorunurluk">
                                <div className="space-y-6">
                                    <Controller
                                        name="active"
                                        control={form.control}
                                        render={({ field }) => (
                                            <div className="flex flex-row items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4">
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

                                    <div className="">
                                        <div className="mb-4">
                                            <h6 className="text-base block mb-1">Müsaitlik Saatleri</h6>
                                            <p className="text-sm text-muted-foreground">
                                                Ürünün sipariş verilebileceği saatleri belirleyin
                                            </p>
                                        </div>
                                        <div className="border rounded-lg p-4 space-y-4">
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
                            </Tabs.TabContent>
                        </Tabs>
                    </form>
                </FormContainer>
            </div>
        </Drawer>
    );
}
