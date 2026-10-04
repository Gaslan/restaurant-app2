'use client';

import { useState } from 'react';
import { MenuWithDetails } from '@/types';

import { Button, Input } from '@/components/ui';

import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { updateProductPrices } from '@/lib/actions/product.actions';
import { Loader2, Check, X, ImageIcon, ChevronDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';


interface PriceEditorViewProps {
    initialData: MenuWithDetails[];
}

export function PriceEditorView({ initialData }: PriceEditorViewProps) {
    const [priceUpdates, setPriceUpdates] = useState<Record<string, number>>({});
    const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
    const router = useRouter();

    const handlePriceChange = (productId: string, newPrice: string) => {
        const price = parseFloat(newPrice);
        if (!isNaN(price)) {
            setPriceUpdates(prev => ({
                ...prev,
                [productId]: price
            }));
        } else if (newPrice === '') {
            // Handle empty input if needed, or just ignore. 
            // Currently parseFloat('') is NaN.
        }
    };

    const handleCancel = (productId: string) => {
        setPriceUpdates(prev => {
            const next = { ...prev };
            delete next[productId];
            return next;
        });
    };

    const handleSingleSave = async (
        productId: string,
        price: number,
        menuId: string,
        categoryId: string,
        restaurantId: string
    ) => {
        setSavingIds(prev => new Set(prev).add(productId));

        const result = await updateProductPrices([{
            productId,
            price,
            menuId,
            categoryId,
            restaurantId
        }]);

        if (result.success) {
            toast.success('Fiyat güncellendi.');
            handleCancel(productId); // Clear the update state
            router.refresh();
        } else {
            toast.error('Guncelleme hatası.');
        }

        setSavingIds(prev => {
            const next = new Set(prev);
            next.delete(productId);
            return next;
        });
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Fiyat Editörü</h1>
                    <p className="text-muted-foreground">
                        Ürünlerin fiyatlarını hızlıca güncelleyin.
                    </p>
                </div>
            </div>

            <div className="w-full flex flex-col gap-4">
                {initialData.map((menu) => (
                    <details key={menu.id} className="group border rounded-md bg-card w-full">
                        <summary className="px-4 py-4 font-semibold text-lg cursor-pointer hover:bg-muted/50 transition-colors list-none [&::-webkit-details-marker]:hidden flex justify-between items-center">
                            <span>{menu.name}</span>
                            <ChevronDown className="h-5 w-5 transition-transform group-open:-rotate-180" />
                        </summary>
                        <div className="border-t">
                            <div className="w-full flex flex-col">
                                {menu.categories.map((category) => (
                                    <details key={category.id} className="group/category border-b border-border last:border-0">
                                        <summary className="px-4 py-4 pl-8 font-medium text-base cursor-pointer hover:bg-muted/30 transition-colors list-none [&::-webkit-details-marker]:hidden flex justify-between items-center bg-muted/10">
                                            <span>{category.name}</span>
                                            <ChevronDown className="h-4 w-4 transition-transform group-open/category:-rotate-180 text-muted-foreground" />
                                        </summary>
                                        <div className="bg-background">
                                            {category.products.map((product) => {
                                                const isModified = priceUpdates[product.id] !== undefined;
                                                const isSaving = savingIds.has(product.id);
                                                const currentPrice = isModified ? priceUpdates[product.id] : product.price;

                                                return (
                                                    <div
                                                        key={product.id}
                                                        className="flex items-center justify-between gap-4 border-t border-border px-4 py-4 pl-12 transition-colors hover:bg-accent/10"
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border bg-muted">
                                                                {product.imageUrl ? (
                                                                    <Image
                                                                        src={product.imageUrl}
                                                                        alt={product.name}
                                                                        fill
                                                                        className="object-cover"
                                                                    />
                                                                ) : (
                                                                    <div className="flex h-full w-full items-center justify-center">
                                                                        <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col gap-1">
                                                                <span className="font-medium text-sm">{product.name}</span>
                                                                {product.description && (
                                                                    <span className="text-xs text-muted-foreground line-clamp-1">
                                                                        {product.description}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <Label htmlFor={`price-${product.id}`} className="sr-only">Fiyat</Label>
                                                            <div className="relative">
                                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                                                                    ₺
                                                                </span>
                                                                <Input
                                                                    id={`price-${product.id}`}
                                                                    type="number"
                                                                    className="w-24 pl-7 text-right"
                                                                    value={currentPrice}
                                                                    onChange={(e) => handlePriceChange(product.id, e.target.value)}
                                                                />
                                                            </div>

                                                            {isModified && (
                                                                <div className="flex items-center gap-1 animate-in fade-in zoom-in duration-200">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="plain"
                                                                        className="h-9 w-9 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                                        onClick={() => handleSingleSave(
                                                                            product.id,
                                                                            currentPrice!,
                                                                            menu.id,
                                                                            category.id,
                                                                            menu.restaurantId
                                                                        )}
                                                                        disabled={isSaving}
                                                                    >
                                                                        {isSaving ? (
                                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                                        ) : (
                                                                            <Check className="h-4 w-4" />
                                                                        )}
                                                                        <span className="sr-only">Kaydet</span>
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="plain"
                                                                        className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                                        onClick={() => handleCancel(product.id)}
                                                                        disabled={isSaving}
                                                                    >
                                                                        <X className="h-4 w-4" />
                                                                        <span className="sr-only">İptal</span>
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {category.products.length === 0 && (
                                                <div className="text-center text-sm text-muted-foreground py-4 border-t border-border pl-12">
                                                    Bu kategoride ürün bulunmuyor.
                                                </div>
                                            )}
                                        </div>
                                    </details>
                                ))}
                                {menu.categories.length === 0 && (
                                    <div className="text-center text-sm text-muted-foreground py-4 border-t border-border pl-8">
                                        Bu menüde kategori bulunmuyor.
                                    </div>
                                )}
                            </div>
                        </div>
                    </details>
                ))}
                {initialData.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground border rounded-md bg-card">
                        Henüz hiç menü oluşturulmamış.
                    </div>
                )}
            </div>
        </div>
    );
}
