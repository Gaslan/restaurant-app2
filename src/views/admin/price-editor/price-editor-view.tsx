'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
    TrendingUp,
    TrendingDown,
    Percent,
    Coins,
    Sparkles,
    Undo2,
    CheckSquare,
    Square,
    Save,
    X,
    ChevronDown,
    ChevronUp,
    UtensilsCrossed,
    Loader2,
    Search,
    Tag,
    Layers,
    ArrowUp,
    ArrowDown,
    ImageIcon,
} from 'lucide-react';

import type {
    Menu,
    MenuWithDetails,
    CategoryWithProducts,
    Product,
} from '@/types';
import { apiGet } from '@/lib/api';
import { updateProductPrices, type PriceUpdateInput } from '@/lib/actions/product.actions';
import { comparePositions } from '@/lib/utils';
import { Button, Input, Select, Badge, Checkbox } from '@/components/ui';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import classNames from '@/utils/classNames';

export type PriceDirection = 'increase' | 'decrease';
export type PriceChangeType = 'percentage' | 'fixed';
export type RoundingType = 'round_005' | 'round_050' | 'round_integer' | 'none';

const ROUNDING_OPTIONS: { value: RoundingType; label: string }[] = [
    { value: 'none', label: 'Yuvarlama Yapma' },
    { value: 'round_005', label: "0.05'in katlarına en yakın değere yuvarla" },
    { value: 'round_050', label: "0.50'nin katlarına en yakın değere yuvarla" },
    { value: 'round_integer', label: 'Tam sayı olarak yuvarla' },
];

const formatPrice = (price: number, currency = 'TRY') => {
    try {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: currency || 'TRY',
        }).format(price);
    } catch {
        return `${price.toFixed(2)} ₺`;
    }
};

/**
 * Calculate the new price based on user inputs and rounding options
 */
function calculateNewPrice(
    originalPrice: number,
    direction: PriceDirection,
    type: PriceChangeType,
    valueNum: number,
    rounding: RoundingType
): number {
    let newPrice = originalPrice;

    if (type === 'percentage') {
        if (direction === 'increase') {
            newPrice = originalPrice * (1 + valueNum / 100);
        } else {
            newPrice = originalPrice * (1 - valueNum / 100);
        }
    } else {
        if (direction === 'increase') {
            newPrice = originalPrice + valueNum;
        } else {
            newPrice = originalPrice - valueNum;
        }
    }

    if (newPrice < 0) {
        newPrice = 0;
    }

    // Apply Rounding
    switch (rounding) {
        case 'round_005':
            newPrice = Math.round(newPrice / 0.05) * 0.05;
            break;
        case 'round_050':
            newPrice = Math.round(newPrice / 0.5) * 0.5;
            break;
        case 'round_integer':
            newPrice = Math.round(newPrice);
            break;
        case 'none':
        default:
            newPrice = Math.round(newPrice * 100) / 100;
            break;
    }

    return Math.round(newPrice * 100) / 100;
}

export function PriceEditorView() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialMenuIdParam = searchParams.get('menuId');

    // Menu and Restaurant data
    const [menus, setMenus] = useState<Menu[]>([]);
    const [selectedMenuId, setSelectedMenuId] = useState<string>('');
    const [menuData, setMenuData] = useState<MenuWithDetails | null>(null);
    const [currency, setCurrency] = useState('TRY');
    const [isLoading, setIsLoading] = useState(true);
    const [isMenuDetailsLoading, setIsMenuDetailsLoading] = useState(false);

    // Search query
    const [searchQuery, setSearchQuery] = useState('');

    // Collapsed categories state (map categoryId -> boolean)
    const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

    // Bulk selection state
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

    // Top Batch Price Form State
    const [batchDirection, setBatchDirection] = useState<PriceDirection>('increase');
    const [batchType, setBatchType] = useState<PriceChangeType>('percentage');
    const [batchValue, setBatchValue] = useState<string>('');
    const [batchRounding, setBatchRounding] = useState<RoundingType>('none');

    // Draft prices edited on screen: productId -> draftPrice (number)
    // If not in draftPrices or equal to product.price, price is unmodified
    const [draftPrices, setDraftPrices] = useState<Record<string, number>>({});

    // Dialogs for Save & Cancel
    const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
    const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Fetch initial menus and restaurant currency
    useEffect(() => {
        async function init() {
            try {
                setIsLoading(true);
                const [menusRes, restaurantRes] = await Promise.all([
                    apiGet<Menu[]>('/api/menus'),
                    apiGet<{ currency?: string }>('/api/restaurant').catch(() => ({
                        data: { currency: 'TRY' },
                    })),
                ]);

                if (restaurantRes?.data?.currency) {
                    setCurrency(restaurantRes.data.currency);
                }

                const allMenus = menusRes.data || [];
                setMenus(allMenus);

                if (allMenus.length > 0) {
                    const matchedMenu = initialMenuIdParam
                        ? allMenus.find((m) => m.id === initialMenuIdParam)
                        : null;
                    const targetId = matchedMenu ? matchedMenu.id : allMenus[0].id;
                    setSelectedMenuId(targetId);
                    await fetchMenuDetails(targetId);
                }
            } catch (error) {
                console.error('Failed to load menus for price editor:', error);
                toast.error('Menüler yüklenirken bir hata oluştu');
            } finally {
                setIsLoading(false);
            }
        }

        init();
    }, [initialMenuIdParam]);

    // Fetch details for selected menu
    const fetchMenuDetails = useCallback(async (menuId: string) => {
        if (!menuId) return;
        try {
            setIsMenuDetailsLoading(true);
            const res = await apiGet<MenuWithDetails>(`/api/menus/${menuId}`);
            if (res.data) {
                const sortedCategories = (res.data.categories || [])
                    .map((cat) => ({
                        ...cat,
                        products: (cat.products || []).slice().sort((a, b) => {
                            const cmp = comparePositions(a.position, b.position);
                            if (cmp !== 0) return cmp;
                            const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
                            const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
                            return timeA - timeB;
                        }),
                    }))
                    .sort((a, b) => {
                        const cmp = comparePositions(a.position, b.position);
                        if (cmp !== 0) return cmp;
                        const timeA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
                        const timeB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
                        return timeA - timeB;
                    });

                setMenuData({
                    ...res.data,
                    categories: sortedCategories,
                });
            }
        } catch (error) {
            console.error('Failed to fetch menu details:', error);
            toast.error('Menü detayları yüklenemedi');
        } finally {
            setIsMenuDetailsLoading(false);
        }
    }, []);

    // Menu selection change
    const handleMenuChange = async (menuId: string) => {
        if (menuId === selectedMenuId) return;

        // Check if there are unsaved changes
        const modifiedCount = countModifiedProducts;
        if (modifiedCount > 0) {
            const confirmed = window.confirm(
                'Kaydedilmemiş fiyat değişiklikleriniz var. Başka bir menüye geçerseniz bu değişiklikler kaybolacak. Devam etmek istiyor musunuz?'
            );
            if (!confirmed) return;
        }

        setSelectedMenuId(menuId);
        setSelectedProductIds([]);
        setDraftPrices({});
        await fetchMenuDetails(menuId);
    };

    // Flatten all products across all categories
    const allProducts = useMemo(() => {
        if (!menuData?.categories) return [];
        return menuData.categories.flatMap((cat) =>
            (cat.products || []).map((prod) => ({
                ...prod,
                categoryId: cat.id,
                categoryName: cat.name,
            }))
        );
    }, [menuData]);

    // Product lookup map
    const productMap = useMemo(() => {
        const map = new Map<string, Product & { categoryId: string }>();
        allProducts.forEach((p) => map.set(p.id, p));
        return map;
    }, [allProducts]);

    // Calculate how many products have been modified
    const modifiedProductsList = useMemo(() => {
        const list: {
            product: Product;
            categoryId: string;
            originalPrice: number;
            newPrice: number;
        }[] = [];

        Object.entries(draftPrices).forEach(([productId, newPrice]) => {
            const p = productMap.get(productId);
            if (p && Number(newPrice) !== Number(p.price)) {
                list.push({
                    product: p,
                    categoryId: p.categoryId,
                    originalPrice: p.price,
                    newPrice: Number(newPrice),
                });
            }
        });

        return list;
    }, [draftPrices, productMap]);

    const countModifiedProducts = modifiedProductsList.length;

    // Toggle single product selection
    const handleToggleSelectProduct = (productId: string) => {
        setSelectedProductIds((prev) =>
            prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
        );
    };

    // Toggle category select: Select all or deselect all products in category
    const handleToggleCategorySelect = (categoryId: string, categoryProductIds: string[]) => {
        const allSelected = categoryProductIds.every((id) => selectedProductIds.includes(id));
        if (allSelected) {
            setSelectedProductIds((prev) => prev.filter((id) => !categoryProductIds.includes(id)));
        } else {
            setSelectedProductIds((prev) => {
                const set = new Set([...prev, ...categoryProductIds]);
                return Array.from(set);
            });
        }
    };

    // Select all products
    const handleSelectAll = () => {
        const allIds = allProducts.map((p) => p.id);
        setSelectedProductIds(allIds);
    };

    // Clear all selections
    const handleClearSelection = () => {
        setSelectedProductIds([]);
    };

    // Apply batch calculation to selected products
    const handleApplyBatchPrice = () => {
        const valNum = parseFloat(batchValue);
        if (isNaN(valNum) || valNum <= 0) {
            toast.error('Lütfen geçerli bir tutar veya yüzde girin');
            return;
        }

        if (selectedProductIds.length === 0) {
            toast.error('Lütfen en az bir ürün seçin');
            return;
        }

        setDraftPrices((prev) => {
            const next = { ...prev };
            selectedProductIds.forEach((productId) => {
                const prod = productMap.get(productId);
                if (prod) {
                    // Always calculate from original price for predictable batch operations
                    const computedPrice = calculateNewPrice(
                        prod.price,
                        batchDirection,
                        batchType,
                        valNum,
                        batchRounding
                    );
                    next[productId] = computedPrice;
                }
            });
            return next;
        });

        toast.success(
            `${selectedProductIds.length} ürünün fiyatı güncellendi. Kaydetmek için aşağıdaki paneli kullanın.`
        );
    };

    // Handle single product input change
    const handleSinglePriceChange = (productId: string, rawVal: string) => {
        const numVal = parseFloat(rawVal);
        if (rawVal === '') {
            setDraftPrices((prev) => ({
                ...prev,
                [productId]: 0,
            }));
            return;
        }

        if (!isNaN(numVal) && numVal >= 0) {
            setDraftPrices((prev) => ({
                ...prev,
                [productId]: numVal,
            }));
        }
    };

    // Revert a single product to its original price
    const handleRevertSingleProduct = (productId: string) => {
        setDraftPrices((prev) => {
            const next = { ...prev };
            delete next[productId];
            return next;
        });
    };

    // Cancel all modifications
    const handleCancelAll = () => {
        setDraftPrices({});
        setCancelConfirmOpen(false);
        toast.info('Tüm fiyat değişiklikleri geri alındı');
    };

    // Save all modifications to database
    const handleSaveAll = async () => {
        if (!menuData || !selectedMenuId || modifiedProductsList.length === 0) {
            setSaveConfirmOpen(false);
            return;
        }

        try {
            setIsSaving(true);

            const payload: PriceUpdateInput[] = modifiedProductsList.map((item) => ({
                restaurantId: menuData.restaurantId,
                menuId: selectedMenuId,
                categoryId: item.categoryId,
                productId: item.product.id,
                price: item.newPrice,
            }));

            const result = await updateProductPrices(payload);

            if (result.success) {
                toast.success(
                    `${modifiedProductsList.length} ürünün fiyatı başarıyla güncellendi!`
                );
                setDraftPrices({});
                setSaveConfirmOpen(false);
                // Refresh menu data from server
                await fetchMenuDetails(selectedMenuId);
            } else {
                toast.error(result.error || 'Fiyatlar güncellenirken bir hata oluştu');
            }
        } catch (error) {
            console.error('Failed to save prices:', error);
            toast.error('Fiyatlar kaydedilemedi');
        } finally {
            setIsSaving(false);
        }
    };

    // Toggle category accordion expand/collapse
    const toggleCategoryCollapse = (catId: string) => {
        setCollapsedCategories((prev) => ({
            ...prev,
            [catId]: !prev[catId],
        }));
    };

    // Filter categories & products based on search
    const filteredCategories = useMemo(() => {
        if (!menuData?.categories) return [];
        const query = searchQuery.trim().toLowerCase();
        if (!query) return menuData.categories;

        return menuData.categories
            .map((cat) => {
                const catMatches = cat.name.toLowerCase().includes(query);
                const matchingProducts = (cat.products || []).filter((p) =>
                    p.name.toLowerCase().includes(query)
                );

                if (catMatches) {
                    return cat;
                }

                if (matchingProducts.length > 0) {
                    return {
                        ...cat,
                        products: matchingProducts,
                    };
                }

                return null;
            })
            .filter(Boolean) as CategoryWithProducts[];
    }, [menuData, searchQuery]);

    const totalProductsCount = allProducts.length;
    const selectedCount = selectedProductIds.length;

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-80 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Fiyat Editörü yükleniyor...</p>
            </div>
        );
    }

    if (menus.length === 0) {
        return (
            <div className="text-center py-16 border rounded-xl bg-card">
                <UtensilsCrossed className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <h3 className="text-xl font-bold mb-2">Henüz Menü Bulunmuyor</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto text-sm">
                    Fiyatları düzenlemeye başlamak için önce bir menü oluşturmalısınız.
                </p>
                <Button
                    variant="solid"
                    onClick={() => router.push('/menus')}
                    className="rounded-full"
                >
                    Menü Oluştur
                </Button>
            </div>
        );
    }

    const currentMenu = menuData || menus.find((m) => m.id === selectedMenuId);

    return (
        <div className="w-full space-y-6 px-4 sm:px-6 py-4 pb-28">
            {/* Header: Title and Menu Switcher */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-gray-100 dark:border-gray-800">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary">
                            <Tag className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
                                Fiyat Editörü
                            </h1>
                            <p className="text-xs sm:text-sm text-muted-foreground">
                                Ürün fiyatlarını liste üzerinden tek tek veya yukarıdaki panelden toplu olarak güncelleyin.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Menu Selection Dropdown */}
                <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                        Menü:
                    </span>
                    <div className="min-w-[200px]">
                        <Select
                            options={menus.map((m) => ({
                                value: m.id,
                                label: m.name,
                            }))}
                            value={
                                menus
                                    .map((m) => ({ value: m.id, label: m.name }))
                                    .find((m) => m.value === selectedMenuId) || null
                            }
                            onChange={(opt: any) => {
                                if (opt?.value) {
                                    handleMenuChange(opt.value);
                                }
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* TOP PANEL: Toplu Fiyat Güncelleme Paneli */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-amber-500" />
                        <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                            Toplu Fiyat Güncelleme Paneli
                        </h2>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>
                            Seçili:{' '}
                            <strong className="text-gray-900 dark:text-gray-100">
                                {selectedCount}
                            </strong>{' '}
                            / {totalProductsCount} ürün
                        </span>
                        <span>•</span>
                        <button
                            type="button"
                            onClick={handleSelectAll}
                            className="text-primary hover:underline font-medium"
                        >
                            Tümünü Seç
                        </button>
                        <span>•</span>
                        <button
                            type="button"
                            onClick={handleClearSelection}
                            className="text-muted-foreground hover:text-gray-700 dark:hover:text-gray-300 hover:underline"
                        >
                            Seçimi Temizle
                        </button>
                    </div>
                </div>

                {/* Controls Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* 1. İşlem Yönü */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                            1. İşlem Yönü
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setBatchDirection('increase')}
                                className={classNames(
                                    'flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-xs font-medium transition-all select-none',
                                    batchDirection === 'increase'
                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 ring-1 ring-emerald-500 shadow-sm'
                                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'
                                )}
                            >
                                <TrendingUp className="h-3.5 w-3.5" />
                                <span>Fiyatı Artır</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setBatchDirection('decrease')}
                                className={classNames(
                                    'flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-xs font-medium transition-all select-none',
                                    batchDirection === 'decrease'
                                        ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 ring-1 ring-rose-500 shadow-sm'
                                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'
                                )}
                            >
                                <TrendingDown className="h-3.5 w-3.5" />
                                <span>Fiyatı Azalt</span>
                            </button>
                        </div>
                    </div>

                    {/* 2. Değişim Türü */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                            2. Değişim Tipi
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setBatchType('percentage')}
                                className={classNames(
                                    'flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-xs font-medium transition-all select-none',
                                    batchType === 'percentage'
                                        ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary shadow-sm font-semibold'
                                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'
                                )}
                            >
                                <Percent className="h-3.5 w-3.5" />
                                <span>Yüzde (%)</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setBatchType('fixed')}
                                className={classNames(
                                    'flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl border text-xs font-medium transition-all select-none',
                                    batchType === 'fixed'
                                        ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary shadow-sm font-semibold'
                                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'
                                )}
                            >
                                <Coins className="h-3.5 w-3.5" />
                                <span>Sabit Miktar</span>
                            </button>
                        </div>
                    </div>

                    {/* 3. Tutar / Yüzde Değeri */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                            {batchType === 'percentage' ? '3. Yüzde Oranı (%)' : '3. Değişim Tutarı'}
                        </label>
                        <Input
                            type="number"
                            min="0"
                            step="any"
                            placeholder={batchType === 'percentage' ? 'Örn: 10' : 'Örn: 25.00'}
                            value={batchValue}
                            onChange={(e) => setBatchValue(e.target.value)}
                            suffix={
                                batchType === 'percentage' ? (
                                    <Percent className="h-4 w-4 text-gray-400" />
                                ) : (
                                    <Coins className="h-4 w-4 text-gray-400" />
                                )
                            }
                        />
                    </div>

                    {/* 4. Yuvarlama Tipi */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                            4. Yuvarlama Tipi
                        </label>
                        <Select
                            options={ROUNDING_OPTIONS}
                            value={
                                ROUNDING_OPTIONS.find((opt) => opt.value === batchRounding) ||
                                ROUNDING_OPTIONS[0]
                            }
                            onChange={(option: any) => {
                                if (option?.value) {
                                    setBatchRounding(option.value as RoundingType);
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Apply Button & Info */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <span className="text-xs text-muted-foreground text-center sm:text-left">
                        {selectedCount === 0 ? (
                            'Fiyat güncellemek için aşağıdaki listeden ürünleri seçin.'
                        ) : (
                            <>
                                Seçilen <strong className="text-gray-900 dark:text-gray-100">{selectedCount}</strong> ürüne{' '}
                                <strong className="text-gray-900 dark:text-gray-100">
                                    {batchDirection === 'increase' ? 'artış' : 'indirim'}
                                </strong>{' '}
                                uygulanacak.
                            </>
                        )}
                    </span>

                    <Button
                        variant="solid"
                        disabled={selectedCount === 0 || !batchValue}
                        onClick={handleApplyBatchPrice}
                        icon={<Sparkles className="h-4 w-4" />}
                        className="rounded-xl w-full sm:w-auto"
                    >
                        {selectedCount > 0
                            ? `Seçili (${selectedCount}) Ürünün Fiyatını Güncelle`
                            : 'Fiyatları Güncelle'}
                    </Button>
                </div>
            </div>

            {/* Search Filter Bar */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Input
                        placeholder="Kategori veya ürün adına göre ara..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        prefix={<Search className="h-4 w-4 text-gray-400" />}
                    />
                </div>
            </div>

            {/* CATEGORIES & PRODUCTS LIST */}
            {isMenuDetailsLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <Loader2 className="h-7 w-7 animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground">Ürünler yükleniyor...</p>
                </div>
            ) : filteredCategories.length === 0 ? (
                <div className="text-center py-12 border rounded-xl bg-card">
                    <Search className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-semibold">Gösterilecek ürün veya kategori bulunamadı</p>
                    {searchQuery && (
                        <p className="text-xs text-muted-foreground mt-1">
                            Arama teriminizi değiştirmeyi deneyin.
                        </p>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredCategories.map((category) => {
                        const categoryProducts = category.products || [];
                        const categoryProductIds = categoryProducts.map((p) => p.id);
                        const isExpanded = !collapsedCategories[category.id];

                        const isAllSelected =
                            categoryProductIds.length > 0 &&
                            categoryProductIds.every((id) => selectedProductIds.includes(id));
                        const isSomeSelected =
                            categoryProductIds.some((id) => selectedProductIds.includes(id));

                        // Count how many products in this category have unsaved price changes
                        const modifiedCountInCat = categoryProducts.filter((p) => {
                            const draft = draftPrices[p.id];
                            return draft !== undefined && Number(draft) !== Number(p.price);
                        }).length;

                        return (
                            <div
                                key={category.id}
                                className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden transition-all"
                            >
                                {/* Category Header */}
                                <div
                                    className="flex items-center justify-between gap-3 p-3.5 bg-gray-50/80 dark:bg-gray-800/40 border-b border-gray-200/80 dark:border-gray-800 select-none cursor-pointer hover:bg-gray-100/70 dark:hover:bg-gray-800/70 transition-colors"
                                    onClick={() => toggleCategoryCollapse(category.id)}
                                >
                                    {/* Left: Category Checkbox + Category Name */}
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <div
                                            className="flex items-center justify-center flex-shrink-0"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Checkbox
                                                checked={isAllSelected}
                                                indeterminate={isSomeSelected && !isAllSelected}
                                                disabled={categoryProductIds.length === 0}
                                                onChange={() =>
                                                    handleToggleCategorySelect(
                                                        category.id,
                                                        categoryProductIds
                                                    )
                                                }
                                            />
                                        </div>

                                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                            <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100 truncate">
                                                {category.name}
                                            </h3>
                                            <Badge
                                                content={`${categoryProducts.length} Ürün`}
                                                className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-[11px] font-normal text-muted-foreground whitespace-nowrap"
                                            />
                                            {modifiedCountInCat > 0 && (
                                                <Badge
                                                    content={`${modifiedCountInCat} Fiyat Değişti`}
                                                    className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-[11px] font-semibold"
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {/* Right: Expand/Collapse Arrow */}
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <span className="text-xs hidden sm:inline">
                                            {isExpanded ? 'Daralt' : 'Genişlet'}
                                        </span>
                                        {isExpanded ? (
                                            <ChevronUp className="h-4 w-4" />
                                        ) : (
                                            <ChevronDown className="h-4 w-4" />
                                        )}
                                    </div>
                                </div>

                                {/* Category Products List */}
                                {isExpanded && (
                                    <div className="divide-y divide-gray-100 dark:divide-gray-800/80">
                                        {categoryProducts.length === 0 ? (
                                            <div className="text-center text-xs text-muted-foreground py-4">
                                                Bu kategoride ürün bulunmuyor.
                                            </div>
                                        ) : (
                                            categoryProducts.map((product) => {
                                                const isSelected = selectedProductIds.includes(
                                                    product.id
                                                );
                                                const originalPrice = product.price;
                                                const hasDraft =
                                                    draftPrices[product.id] !== undefined;
                                                const currentPrice = hasDraft
                                                    ? draftPrices[product.id]
                                                    : originalPrice;
                                                const isModified =
                                                    Number(currentPrice) !== Number(originalPrice);

                                                const isIncreased =
                                                    isModified && currentPrice > originalPrice;
                                                const isDecreased =
                                                    isModified && currentPrice < originalPrice;

                                                const priceDiff = Math.abs(
                                                    currentPrice - originalPrice
                                                );
                                                const percentDiff =
                                                    originalPrice > 0
                                                        ? Math.round(
                                                              (priceDiff / originalPrice) * 100
                                                          )
                                                        : 0;

                                                return (
                                                    <div
                                                        key={product.id}
                                                        className={classNames(
                                                            'flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 transition-colors',
                                                            isSelected
                                                                ? 'bg-primary/5 dark:bg-primary/10'
                                                                : 'hover:bg-gray-50/50 dark:hover:bg-gray-800/30'
                                                        )}
                                                    >
                                                        {/* Left: Checkbox, Product Image & Product Name */}
                                                        <div className="flex items-center gap-3 min-w-0 flex-1">
                                                            <div className="flex items-center justify-center flex-shrink-0">
                                                                <Checkbox
                                                                    checked={isSelected}
                                                                    onChange={() =>
                                                                        handleToggleSelectProduct(
                                                                            product.id
                                                                        )
                                                                    }
                                                                />
                                                            </div>

                                                            {/* Product Thumbnail */}
                                                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                                                                {product.imageUrl ? (
                                                                    <img
                                                                        src={product.imageUrl}
                                                                        alt={product.name}
                                                                        className="w-full h-full object-cover"
                                                                        loading="lazy"
                                                                    />
                                                                ) : (
                                                                    <ImageIcon className="h-4 w-4 text-gray-400" />
                                                                )}
                                                            </div>

                                                            <div className="min-w-0 flex-1">
                                                                <span className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate block">
                                                                    {product.name}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Right: Price Control Area */}
                                                        <div className="flex items-center justify-end gap-3 flex-shrink-0 pl-7 sm:pl-0">
                                                            {/* If price is modified: Show old price crossed out */}
                                                            {isModified && (
                                                                <div className="flex items-center gap-2">
                                                                    <span className="line-through text-xs sm:text-sm text-muted-foreground select-none">
                                                                        {formatPrice(
                                                                            originalPrice,
                                                                            currency
                                                                        )}
                                                                    </span>

                                                                    {/* Direction Icon & Percent Badge */}
                                                                    {isIncreased && (
                                                                        <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                                                                            <ArrowUp className="h-3 w-3" />
                                                                            %{percentDiff}
                                                                        </span>
                                                                    )}
                                                                    {isDecreased && (
                                                                        <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-full">
                                                                            <ArrowDown className="h-3 w-3" />
                                                                            -%{percentDiff}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            )}

                                                            {/* Price Input Box */}
                                                            <div className="relative w-28 sm:w-32">
                                                                <Input
                                                                    type="number"
                                                                    step="any"
                                                                    min="0"
                                                                    value={
                                                                        hasDraft
                                                                            ? currentPrice === 0
                                                                                ? ''
                                                                                : currentPrice
                                                                            : originalPrice
                                                                    }
                                                                    onChange={(e) =>
                                                                        handleSinglePriceChange(
                                                                            product.id,
                                                                            e.target.value
                                                                        )
                                                                    }
                                                                    className={classNames(
                                                                        'text-right font-medium text-sm transition-all pr-7',
                                                                        isIncreased
                                                                            ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-semibold ring-1 ring-emerald-500/50'
                                                                            : isDecreased
                                                                            ? 'border-rose-500 bg-rose-50/40 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 font-semibold ring-1 ring-rose-500/50'
                                                                            : ''
                                                                    )}
                                                                />
                                                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none select-none">
                                                                    ₺
                                                                </span>
                                                            </div>

                                                            {/* Revert Single Product Button */}
                                                            {isModified && (
                                                                <Button
                                                                    size="xs"
                                                                    variant="plain"
                                                                    title="Orijinal fiyata dön"
                                                                    onClick={() =>
                                                                        handleRevertSingleProduct(
                                                                            product.id
                                                                        )
                                                                    }
                                                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-gray-900 dark:hover:text-gray-100"
                                                                >
                                                                    <Undo2 className="h-4 w-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* FLOATING BOTTOM ACTION BAR: Appears when at least one price has been modified */}
            {countModifiedProducts > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl rounded-2xl px-5 py-3.5 flex items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-5 duration-200">
                    {/* Left: Summary of modified count */}
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 font-bold text-sm">
                            {countModifiedProducts}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                                {countModifiedProducts} ürünün fiyatı güncellendi
                            </span>
                            <span className="text-xs text-muted-foreground truncate">
                                Değişiklikleri uygulamak için kaydedin
                            </span>
                        </div>
                    </div>

                    {/* Right: Cancel & Save Buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                            size="sm"
                            variant="default"
                            className="rounded-xl"
                            onClick={() => setCancelConfirmOpen(true)}
                        >
                            İptal
                        </Button>
                        <Button
                            size="sm"
                            variant="solid"
                            className="rounded-xl"
                            onClick={() => setSaveConfirmOpen(true)}
                            icon={<Save className="h-4 w-4" />}
                        >
                            Kaydet
                        </Button>
                    </div>
                </div>
            )}

            {/* CANCEL CONFIRMATION DIALOG */}
            <ConfirmDialog
                isOpen={cancelConfirmOpen}
                type="warning"
                title="Değişiklikleri İptal Et"
                confirmText="Evet, İptal Et"
                cancelText="Vazgeç"
                onClose={() => setCancelConfirmOpen(false)}
                onRequestClose={() => setCancelConfirmOpen(false)}
                onCancel={() => setCancelConfirmOpen(false)}
                onConfirm={handleCancelAll}
            >
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    Yapılan <strong>{countModifiedProducts}</strong> adet ürün fiyatı değişikliği geri
                    alınacak ve ürünler orijinal fiyatlarına dönecektir. Devam etmek istediğinize emin
                    misiniz?
                </p>
            </ConfirmDialog>

            {/* SAVE CONFIRMATION DIALOG */}
            <ConfirmDialog
                isOpen={saveConfirmOpen}
                type="info"
                title="Fiyat Değişikliklerini Kaydet"
                confirmText="Evet, Kaydet"
                cancelText="Vazgeç"
                onClose={() => setSaveConfirmOpen(false)}
                onRequestClose={() => setSaveConfirmOpen(false)}
                onCancel={() => setSaveConfirmOpen(false)}
                onConfirm={handleSaveAll}
                confirmButtonProps={{
                    loading: isSaving,
                }}
            >
                <p className="text-sm text-gray-600 dark:text-gray-300">
                    Toplam <strong>{countModifiedProducts}</strong> ürünün yeni fiyatı sisteme
                    kaydedilecektir. Bu işlemi onaylıyor musunuz?
                </p>
            </ConfirmDialog>
        </div>
    );
}
