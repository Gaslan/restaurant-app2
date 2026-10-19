'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
    ArrowLeft,
    Loader2,
    Sliders,
    Palette,
    Eye,
    Flame,
    Tag,
} from 'lucide-react';
import { TbCheck } from 'react-icons/tb';

import { apiGet, apiPatch } from '@/lib/api';
import type { Menu, MenuWithDetails, Restaurant } from '@/types';
import Button from '@/components/ui/Button';
import Switcher from '@/components/ui/Switcher';
import { QrMenuView } from '@/views/qr/qr-menu-view';

// Fallback demo categories for preview if the menu has no products yet
const DEMO_PREVIEW_CATEGORIES = [
    {
        id: 'demo-cat-1',
        name: 'Öne Çıkanlar & Başlangıçlar',
        description: 'Şefimizin özel tarifleri ve taze lezzetler',
        position: '0',
        imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=80',
        menuId: 'demo-menu',
        createdAt: new Date(),
        updatedAt: new Date(),
        products: [
            {
                id: 'demo-prod-1',
                name: 'Trüflü Burger & Patates',
                description: 'Köz patlıcan püresi, karamelize soğan, trüf mayonez ve çıtır patates eşliğinde',
                price: 360,
                imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&auto=format&fit=crop&q=80',
                categoryId: 'demo-cat-1',
                position: '0',
                available: true,
                active: true,
                tags: ['POPULAR', 'NEW'] as any,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'demo-prod-2',
                name: 'Taş Fırın Margherita Pizza',
                description: 'San Marzano domates sosu, manda mozzarellası ve taze fesleğen yaprakları',
                price: 310,
                imageUrl: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=600&auto=format&fit=crop&q=80',
                categoryId: 'demo-cat-1',
                position: '1',
                available: true,
                active: true,
                tags: ['VEGETARIAN'] as any,
                discount: {
                    enabled: true,
                    discountedPrice: 249,
                },
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ],
    },
    {
        id: 'demo-cat-2',
        name: 'İçecekler & Tatlılar',
        description: 'Doğal meyve püreleri ve ev yapımı tatlılar',
        position: '1',
        imageUrl: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&auto=format&fit=crop&q=80',
        menuId: 'demo-menu',
        createdAt: new Date(),
        updatedAt: new Date(),
        products: [
            {
                id: 'demo-prod-3',
                name: 'San Sebastian Cheesecake',
                description: 'Belçika çikolatası sosu ile servis edilir',
                price: 210,
                imageUrl: 'https://images.unsplash.com/photo-1508737027454-e6454ef45afd?w=600&auto=format&fit=crop&q=80',
                categoryId: 'demo-cat-2',
                position: '0',
                available: true,
                active: true,
                tags: ['POPULAR'] as any,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'demo-prod-4',
                name: 'Ev Yapımı Çilekli Limonata',
                description: 'Taze nane ve dağ çileği ile demlenmiş soğuk ferahlık',
                price: 110,
                imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80',
                categoryId: 'demo-cat-2',
                position: '1',
                available: true,
                active: true,
                discount: {
                    enabled: true,
                    discountedPrice: 85,
                },
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ],
    },
];

interface MenuSettingsViewProps {
    menuId: string;
}

export function MenuSettingsView({ menuId }: MenuSettingsViewProps) {
    const router = useRouter();

    const [menu, setMenu] = useState<MenuWithDetails | null>(null);
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // 1. Appearance: Image Placement
    const [imagePosition, setImagePosition] = useState<'right' | 'left' | 'top' | 'grid'>('right');
    const [initialImagePosition, setInitialImagePosition] = useState<'right' | 'left' | 'top' | 'grid'>('right');

    // 2. Appearance: Description Visibility
    const [showDescription, setShowDescription] = useState<boolean>(true);
    const [initialShowDescription, setInitialShowDescription] = useState<boolean>(true);

    // 3. Featured: Popular Products
    const [showPopular, setShowPopular] = useState<boolean>(false);
    const [initialShowPopular, setInitialShowPopular] = useState<boolean>(false);
    const [popularLayout, setPopularLayout] = useState<'grid' | 'scroll'>('grid');
    const [initialPopularLayout, setInitialPopularLayout] = useState<'grid' | 'scroll'>('grid');

    // 4. Featured: Discounted Products
    const [showDiscounted, setShowDiscounted] = useState<boolean>(false);
    const [initialShowDiscounted, setInitialShowDiscounted] = useState<boolean>(false);
    const [discountedLayout, setDiscountedLayout] = useState<'grid' | 'scroll'>('grid');
    const [initialDiscountedLayout, setInitialDiscountedLayout] = useState<'grid' | 'scroll'>('grid');

    // 5. Category Nav Layout
    const [categoryNavLayout, setCategoryNavLayout] = useState<'text' | 'image' | 'both' | 'vertical'>('text');
    const [initialCategoryNavLayout, setInitialCategoryNavLayout] = useState<'text' | 'image' | 'both' | 'vertical'>('text');

    const isDirty =
        imagePosition !== initialImagePosition ||
        showDescription !== initialShowDescription ||
        showPopular !== initialShowPopular ||
        popularLayout !== initialPopularLayout ||
        showDiscounted !== initialShowDiscounted ||
        discountedLayout !== initialDiscountedLayout ||
        categoryNavLayout !== initialCategoryNavLayout;

    // Load initial data
    useEffect(() => {
        async function loadData() {
            setIsLoading(true);
            try {
                const [menuRes, restRes] = await Promise.all([
                    apiGet<MenuWithDetails>(`/api/menus/${menuId}`),
                    apiGet<Restaurant>('/api/restaurant').catch(() => ({ data: null })),
                ]);

                if (menuRes.data) {
                    const m = menuRes.data;
                    setMenu(m);

                    const pos = m.appearance?.imagePosition || 'right';
                    setImagePosition(pos);
                    setInitialImagePosition(pos);

                    const desc = m.appearance?.showDescription ?? true;
                    setShowDescription(desc);
                    setInitialShowDescription(desc);

                    const popShow = m.appearance?.showPopular ?? false;
                    setShowPopular(popShow);
                    setInitialShowPopular(popShow);

                    const popLay = m.appearance?.popularLayout || 'grid';
                    setPopularLayout(popLay);
                    setInitialPopularLayout(popLay);

                    const discShow = m.appearance?.showDiscounted ?? false;
                    setShowDiscounted(discShow);
                    setInitialShowDiscounted(discShow);

                    const discLay = m.appearance?.discountedLayout || 'grid';
                    setDiscountedLayout(discLay);
                    setInitialDiscountedLayout(discLay);

                    const catNav = m.appearance?.categoryNavLayout || 'text';
                    setCategoryNavLayout(catNav);
                    setInitialCategoryNavLayout(catNav);
                }

                if (restRes.data) {
                    setRestaurant(restRes.data);
                }
            } catch (error) {
                console.error('Failed to load menu settings:', error);
                toast.error('Menü ayarları yüklenemedi');
            } finally {
                setIsLoading(false);
            }
        }

        loadData();
    }, [menuId]);

    // Live preview menu
    const previewMenu = useMemo<MenuWithDetails>(() => {
        const hasProducts = menu?.categories && menu.categories.some((c) => c.products && c.products.length > 0);
        return {
            id: menu?.id || menuId,
            name: menu?.name || 'Menü',
            orderValue: menu?.orderValue || 0,
            isActive: menu?.isActive ?? true,
            restaurantId: menu?.restaurantId || restaurant?.id || '',
            createdAt: menu?.createdAt || new Date(),
            updatedAt: new Date(),
            appearance: {
                imagePosition,
                showDescription,
                showPopular,
                popularLayout,
                showDiscounted,
                discountedLayout,
                categoryNavLayout,
            },
            categories: hasProducts ? menu!.categories : (DEMO_PREVIEW_CATEGORIES as any),
        };
    }, [menu, menuId, restaurant, imagePosition, showDescription, showPopular, popularLayout, showDiscounted, discountedLayout, categoryNavLayout]);

    // Save appearance handler
    const handleSave = async () => {
        setIsSaving(true);
        try {
            const payload = {
                appearance: {
                    imagePosition,
                    showDescription,
                    showPopular,
                    popularLayout,
                    showDiscounted,
                    discountedLayout,
                    categoryNavLayout,
                },
            };

            const res = await apiPatch<Menu>(`/api/menus/${menuId}`, payload);
            if (res.data) {
                setMenu((prev) => (prev ? { ...prev, ...res.data } : null));
                setInitialImagePosition(imagePosition);
                setInitialShowDescription(showDescription);
                setInitialShowPopular(showPopular);
                setInitialPopularLayout(popularLayout);
                setInitialShowDiscounted(showDiscounted);
                setInitialDiscountedLayout(discountedLayout);
                setInitialCategoryNavLayout(categoryNavLayout);
            }
            toast.success('Menü görünüm ayarları başarıyla kaydedildi');
        } catch (error) {
            console.error('Failed to save menu appearance settings:', error);
            toast.error('Menü ayarları kaydedilirken hata oluştu');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDiscard = () => {
        setImagePosition(initialImagePosition);
        setShowDescription(initialShowDescription);
        setShowPopular(initialShowPopular);
        setPopularLayout(initialPopularLayout);
        setShowDiscounted(initialShowDiscounted);
        setDiscountedLayout(initialDiscountedLayout);
        setCategoryNavLayout(initialCategoryNavLayout);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!menu) {
        return (
            <div className="text-center py-12 border rounded-xl bg-white dark:bg-gray-800">
                <h1 className="text-xl font-bold mb-2">Menü Bulunamadı</h1>
                <p className="text-sm text-gray-500 mb-4">Aradığınız menü mevcut değil veya silinmiş olabilir.</p>
                <Button variant="solid" onClick={() => router.push('/menus')} className="rounded-full">
                    <span>Menülere Dön</span>
                </Button>
            </div>
        );
    }

    return (
        <div className="w-full space-y-6 pb-12">
            {/* Header & Breadcrumb */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 dark:border-gray-800">
                <div className="space-y-1">
                    <div className="flex items-center gap-3 pt-1">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight heading-text">
                                {menu.name} - Görünüm Ayarları
                            </h1>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Bu menüye özel vitrin alanlarını, görsel yerleşimini ve açıklama görünümünü özelleştirin
                            </p>
                        </div>
                    </div>
                </div>

                {/* Top Action Buttons */}
                <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Button
                        type="button"
                        disabled={!isDirty || isSaving}
                        onClick={handleDiscard}
                        className="rounded-full"
                    >
                        Vazgeç
                    </Button>
                    <Button
                        variant="solid"
                        type="button"
                        loading={isSaving}
                        disabled={!isDirty && !isSaving}
                        onClick={handleSave}
                        className="rounded-full"
                    >
                        Değişiklikleri Kaydet
                    </Button>
                </div>
            </div>

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                
                {/* Left Column: Settings Cards */}
                <div className="xl:col-span-7 2xl:col-span-8 space-y-6">

                    {/* Section 1: Category Navigation Layout */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700/80 shadow-xs p-6 space-y-5">
                        <div className="flex items-center gap-3.5 pb-4 border-b border-gray-100 dark:border-gray-700/60">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                                <Sliders className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold heading-text">
                                    Kategori Sekmeleri Görünümü
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    QR menünün en üstündeki yatay kategori çubuğunda kategorilerin nasıl listeleneceğini belirleyin.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                            {/* Option 1: Sadece Yazı */}
                            <div
                                onClick={() => setCategoryNavLayout('text')}
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                                    categoryNavLayout === 'text'
                                        ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-xs'
                                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900'
                                }`}
                            >
                                <div className="w-full h-18 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2 flex items-center gap-1.5 overflow-hidden mb-2.5">
                                    <div className="px-2.5 py-1 rounded-full bg-zinc-900 text-[10px] text-white font-semibold shrink-0">
                                        Burger
                                    </div>
                                    <div className="px-2.5 py-1 rounded-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-[10px] text-gray-700 dark:text-gray-300 font-semibold shrink-0">
                                        Pizza
                                    </div>
                                    <div className="px-2.5 py-1 rounded-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-[10px] text-gray-700 dark:text-gray-300 font-semibold shrink-0">
                                        Tatlı
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold heading-text">
                                            Sadece Yazı
                                        </span>
                                        {categoryNavLayout === 'text' && (
                                            <div className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center">
                                                <TbCheck className="w-3 h-3" />
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[11px] text-gray-500 mt-0.5 block">
                                        Yalnızca metin içeren klasik hap butonlar
                                    </span>
                                </div>
                            </div>

                            {/* Option 2: Sadece Görsel */}
                            <div
                                onClick={() => setCategoryNavLayout('image')}
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                                    categoryNavLayout === 'image'
                                        ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-xs'
                                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900'
                                }`}
                            >
                                <div className="w-full h-18 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2 flex items-center justify-center gap-2 overflow-hidden mb-2.5">
                                    <div className="w-9 h-9 rounded-full bg-amber-400 border-2 border-zinc-900 flex items-center justify-center text-xs shrink-0 shadow-xs">
                                        🍔
                                    </div>
                                    <div className="w-9 h-9 rounded-full bg-red-400 border border-gray-200 dark:border-gray-600 flex items-center justify-center text-xs shrink-0">
                                        🍕
                                    </div>
                                    <div className="w-9 h-9 rounded-full bg-purple-400 border border-gray-200 dark:border-gray-600 flex items-center justify-center text-xs shrink-0">
                                        🍰
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold heading-text">
                                            Sadece Görsel
                                        </span>
                                        {categoryNavLayout === 'image' && (
                                            <div className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center">
                                                <TbCheck className="w-3 h-3" />
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[11px] text-gray-500 mt-0.5 block">
                                        Yuvarlak görsel simgelerden oluşan çubuk
                                    </span>
                                </div>
                            </div>

                            {/* Option 3: Yan Yana (Görsel ve Yazı) */}
                            <div
                                onClick={() => setCategoryNavLayout('both')}
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                                    categoryNavLayout === 'both'
                                        ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-xs'
                                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900'
                                }`}
                            >
                                <div className="w-full h-18 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2 flex items-center gap-1.5 overflow-hidden mb-2.5">
                                    <div className="pl-1 pr-2 py-1 rounded-full bg-zinc-900 text-white flex items-center gap-1 text-[10px] font-semibold shrink-0">
                                        <span className="w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center text-[9px]">🍔</span>
                                        <span>Burger</span>
                                    </div>
                                    <div className="pl-1 pr-2 py-1 rounded-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 flex items-center gap-1 text-[10px] font-semibold shrink-0">
                                        <span className="w-4 h-4 rounded-full bg-red-400 flex items-center justify-center text-[9px]">🍕</span>
                                        <span>Pizza</span>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold heading-text">
                                            Yazı ve Görsel (Yan Yana)
                                        </span>
                                        {categoryNavLayout === 'both' && (
                                            <div className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center">
                                                <TbCheck className="w-3 h-3" />
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[11px] text-gray-500 mt-0.5 block">
                                        Resim ve metin yan yana hap butonda
                                    </span>
                                </div>
                            </div>

                            {/* Option 4: Üstte Görsel, Altta Yazı */}
                            <div
                                onClick={() => setCategoryNavLayout('vertical')}
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                                    categoryNavLayout === 'vertical'
                                        ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-xs'
                                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900'
                                }`}
                            >
                                <div className="w-full h-18 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2 flex items-center justify-center gap-3 overflow-hidden mb-2.5">
                                    <div className="flex flex-col items-center gap-1 shrink-0">
                                        <div className="w-7 h-7 rounded-full bg-amber-400 border-2 border-zinc-900 flex items-center justify-center text-[10px] shadow-xs">
                                            🍔
                                        </div>
                                        <div className="w-6 h-1 rounded-full bg-zinc-900" />
                                    </div>
                                    <div className="flex flex-col items-center gap-1 shrink-0 opacity-80">
                                        <div className="w-7 h-7 rounded-full bg-red-400 border border-gray-200 dark:border-gray-600 flex items-center justify-center text-[10px]">
                                            🍕
                                        </div>
                                        <div className="w-6 h-1 rounded-full bg-gray-400 dark:bg-gray-600" />
                                    </div>
                                    <div className="flex flex-col items-center gap-1 shrink-0 opacity-80">
                                        <div className="w-7 h-7 rounded-full bg-purple-400 border border-gray-200 dark:border-gray-600 flex items-center justify-center text-[10px]">
                                            🍰
                                        </div>
                                        <div className="w-6 h-1 rounded-full bg-gray-400 dark:bg-gray-600" />
                                    </div>
                                </div>
                                <div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold heading-text">
                                            Üstte Görsel, Altta Yazı
                                        </span>
                                        {categoryNavLayout === 'vertical' && (
                                            <div className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center">
                                                <TbCheck className="w-3 h-3" />
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-[11px] text-gray-500 mt-0.5 block">
                                        Yuvarlak resim üstte, kategori adı altta
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Popüler Ürünler Vitrini */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700/80 shadow-xs p-6 space-y-5">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center shrink-0">
                                    <Flame className="w-5 h-5 text-amber-500" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold heading-text">
                                        Popüler Ürünler Vitrini
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        "Popüler" etiketi bulunan lezzetleri QR menünün en üstünde öne çıkarın.
                                    </p>
                                </div>
                            </div>

                            <Switcher
                                checked={showPopular}
                                onChange={(checked) => setShowPopular(checked)}
                            />
                        </div>

                        {/* Conditional Display Options */}
                        {showPopular && (
                            <div className="pt-4 border-t border-gray-100 dark:border-gray-700/60 space-y-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                                        Popüler Ürünler Görünüm Düzeni
                                    </label>
                                    <p className="text-xs text-gray-500 mb-3">
                                        Popüler ürünlerin ziyaretçilere sunulma biçimini seçin.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    {/* Option 1: Grid (Her satırda iki ürün) */}
                                    <div
                                        onClick={() => setPopularLayout('grid')}
                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                                            popularLayout === 'grid'
                                                ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-xs'
                                                : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900'
                                        }`}
                                    >
                                        <div className="w-full h-18 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2 grid grid-cols-2 gap-2 mb-2.5">
                                            <div className="bg-white dark:bg-gray-700/60 rounded border border-gray-200 dark:border-gray-600 p-1 flex flex-col justify-between">
                                                <div className="w-full h-5 rounded bg-amber-100 dark:bg-amber-900/40" />
                                                <div className="w-2/3 h-1 bg-gray-300 dark:bg-gray-500 rounded-xs" />
                                            </div>
                                            <div className="bg-white dark:bg-gray-700/60 rounded border border-gray-200 dark:border-gray-600 p-1 flex flex-col justify-between">
                                                <div className="w-full h-5 rounded bg-amber-100 dark:bg-amber-900/40" />
                                                <div className="w-2/3 h-1 bg-gray-300 dark:bg-gray-500 rounded-xs" />
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold heading-text">
                                                İkili Izgara (2'li)
                                            </span>
                                            {popularLayout === 'grid' && (
                                                <div className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center">
                                                    <TbCheck className="w-3 h-3" />
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[11px] text-gray-500 mt-0.5">
                                            Her satırda iki ürün yan yana listelenir
                                        </span>
                                    </div>

                                    {/* Option 2: Scroll (Yatay kaydırmalı şerit) */}
                                    <div
                                        onClick={() => setPopularLayout('scroll')}
                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                                            popularLayout === 'scroll'
                                                ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-xs'
                                                : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900'
                                        }`}
                                    >
                                        <div className="w-full h-18 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2 flex items-center gap-1.5 overflow-hidden mb-2.5">
                                            <div className="w-14 h-full shrink-0 bg-white dark:bg-gray-700/60 rounded border border-gray-200 dark:border-gray-600 p-1 flex flex-col justify-between">
                                                <div className="w-full h-5 rounded bg-amber-100 dark:bg-amber-900/40" />
                                                <div className="w-3/4 h-1 bg-gray-300 dark:bg-gray-500 rounded-xs" />
                                            </div>
                                            <div className="w-14 h-full shrink-0 bg-white dark:bg-gray-700/60 rounded border border-gray-200 dark:border-gray-600 p-1 flex flex-col justify-between">
                                                <div className="w-full h-5 rounded bg-amber-100 dark:bg-amber-900/40" />
                                                <div className="w-3/4 h-1 bg-gray-300 dark:bg-gray-500 rounded-xs" />
                                            </div>
                                            <div className="w-8 h-full shrink-0 bg-white/60 dark:bg-gray-700/30 rounded border border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-400">
                                                <span className="text-[10px]">→</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold heading-text">
                                                Yatay Kaydırmalı Şerit
                                            </span>
                                            {popularLayout === 'scroll' && (
                                                <div className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center">
                                                    <TbCheck className="w-3 h-3" />
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[11px] text-gray-500 mt-0.5">
                                            Tek satırda yan yana, parmakla kaydırılabilir
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Section 2: İndirimdeki Ürünler Vitrini */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700/80 shadow-xs p-6 space-y-5">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                    <Tag className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold heading-text">
                                        İndirimdeki Ürünler Vitrini
                                    </h3>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Aktif indirimi olan ürünleri menünün başında fırsat alanı olarak sergileyin.
                                    </p>
                                </div>
                            </div>

                            <Switcher
                                checked={showDiscounted}
                                onChange={(checked) => setShowDiscounted(checked)}
                            />
                        </div>

                        {/* Conditional Display Options */}
                        {showDiscounted && (
                            <div className="pt-4 border-t border-gray-100 dark:border-gray-700/60 space-y-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                                        İndirimdeki Ürünler Görünüm Düzeni
                                    </label>
                                    <p className="text-xs text-gray-500 mb-3">
                                        İndirimli ürünlerin ziyaretçilere sunulma biçimini seçin.
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    {/* Option 1: Grid (Her satırda iki ürün) */}
                                    <div
                                        onClick={() => setDiscountedLayout('grid')}
                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                                            discountedLayout === 'grid'
                                                ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-xs'
                                                : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900'
                                        }`}
                                    >
                                        <div className="w-full h-18 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2 grid grid-cols-2 gap-2 mb-2.5">
                                            <div className="bg-white dark:bg-gray-700/60 rounded border border-gray-200 dark:border-gray-600 p-1 flex flex-col justify-between">
                                                <div className="w-full h-5 rounded bg-emerald-100 dark:bg-emerald-900/40" />
                                                <div className="w-2/3 h-1 bg-gray-300 dark:bg-gray-500 rounded-xs" />
                                            </div>
                                            <div className="bg-white dark:bg-gray-700/60 rounded border border-gray-200 dark:border-gray-600 p-1 flex flex-col justify-between">
                                                <div className="w-full h-5 rounded bg-emerald-100 dark:bg-emerald-900/40" />
                                                <div className="w-2/3 h-1 bg-gray-300 dark:bg-gray-500 rounded-xs" />
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold heading-text">
                                                İkili Izgara (2'li)
                                            </span>
                                            {discountedLayout === 'grid' && (
                                                <div className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center">
                                                    <TbCheck className="w-3 h-3" />
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[11px] text-gray-500 mt-0.5">
                                            Her satırda iki ürün yan yana listelenir
                                        </span>
                                    </div>

                                    {/* Option 2: Scroll (Yatay kaydırmalı şerit) */}
                                    <div
                                        onClick={() => setDiscountedLayout('scroll')}
                                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                                            discountedLayout === 'scroll'
                                                ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-xs'
                                                : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900'
                                        }`}
                                    >
                                        <div className="w-full h-18 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2 flex items-center gap-1.5 overflow-hidden mb-2.5">
                                            <div className="w-14 h-full shrink-0 bg-white dark:bg-gray-700/60 rounded border border-gray-200 dark:border-gray-600 p-1 flex flex-col justify-between">
                                                <div className="w-full h-5 rounded bg-emerald-100 dark:bg-emerald-900/40" />
                                                <div className="w-3/4 h-1 bg-gray-300 dark:bg-gray-500 rounded-xs" />
                                            </div>
                                            <div className="w-14 h-full shrink-0 bg-white dark:bg-gray-700/60 rounded border border-gray-200 dark:border-gray-600 p-1 flex flex-col justify-between">
                                                <div className="w-full h-5 rounded bg-emerald-100 dark:bg-emerald-900/40" />
                                                <div className="w-3/4 h-1 bg-gray-300 dark:bg-gray-500 rounded-xs" />
                                            </div>
                                            <div className="w-8 h-full shrink-0 bg-white/60 dark:bg-gray-700/30 rounded border border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-400">
                                                <span className="text-[10px]">→</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold heading-text">
                                                Yatay Kaydırmalı Şerit
                                            </span>
                                            {discountedLayout === 'scroll' && (
                                                <div className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center">
                                                    <TbCheck className="w-3 h-3" />
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[11px] text-gray-500 mt-0.5">
                                            Tek satırda yan yana, parmakla kaydırılabilir
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    {/* Section 3: Product Image Placement */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700/80 shadow-xs p-6 space-y-5">
                        <div className="flex items-center gap-3.5 pb-4 border-b border-gray-100 dark:border-gray-700/60">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                                <Palette className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold heading-text">
                                    Ürün Görseli Yerleşimi
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Kategorilerdeki ürünlerin liste görünüm düzenini belirleyin.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                            {/* Option: RIGHT */}
                            <div
                                onClick={() => setImagePosition('right')}
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                                    imagePosition === 'right'
                                        ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-xs'
                                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900'
                                }`}
                            >
                                <div className="w-full h-20 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2 flex items-center justify-between gap-2 mb-3">
                                    <div className="space-y-1.5 flex-1">
                                        <div className="w-3/4 h-2 bg-gray-300 dark:bg-gray-600 rounded-xs" />
                                        <div className="w-1/2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-xs" />
                                        <div className="w-1/3 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-xs mt-1" />
                                    </div>
                                    <div className="w-11 h-11 rounded-md bg-amber-100/90 border border-amber-300/60 dark:bg-amber-900/40 shrink-0 flex items-center justify-center text-[10px] text-amber-800 dark:text-amber-200 font-bold">
                                        Resim
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold heading-text">
                                        Sağda (Klasik)
                                    </span>
                                    {imagePosition === 'right' && (
                                        <div className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center">
                                            <TbCheck className="w-3 h-3" />
                                        </div>
                                    )}
                                </div>
                                <span className="text-[11px] text-gray-500 mt-0.5">
                                    Metin solda, 72px resim sağda
                                </span>
                            </div>

                            {/* Option: LEFT */}
                            <div
                                onClick={() => setImagePosition('left')}
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                                    imagePosition === 'left'
                                        ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-xs'
                                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900'
                                }`}
                            >
                                <div className="w-full h-20 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2 flex items-center gap-2 mb-3">
                                    <div className="w-11 h-11 rounded-md bg-amber-100/90 border border-amber-300/60 dark:bg-amber-900/40 shrink-0 flex items-center justify-center text-[10px] text-amber-800 dark:text-amber-200 font-bold">
                                        Resim
                                    </div>
                                    <div className="space-y-1.5 flex-1">
                                        <div className="w-3/4 h-2 bg-gray-300 dark:bg-gray-600 rounded-xs" />
                                        <div className="w-1/2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-xs" />
                                        <div className="w-1/3 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-xs mt-1" />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold heading-text">
                                        Solda
                                    </span>
                                    {imagePosition === 'left' && (
                                        <div className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center">
                                            <TbCheck className="w-3 h-3" />
                                        </div>
                                    )}
                                </div>
                                <span className="text-[11px] text-gray-500 mt-0.5">
                                    72px resim solda, metin sağda
                                </span>
                            </div>

                            {/* Option: TOP */}
                            <div
                                onClick={() => setImagePosition('top')}
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                                    imagePosition === 'top'
                                        ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-xs'
                                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900'
                                }`}
                            >
                                <div className="w-full h-20 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2 flex flex-col justify-between gap-1 mb-3">
                                    <div className="w-full h-9 rounded bg-amber-100/90 border border-amber-300/60 dark:bg-amber-900/40 flex items-center justify-center text-[10px] text-amber-800 dark:text-amber-200 font-bold">
                                        Geniş Resim
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="w-2/3 h-2 bg-gray-300 dark:bg-gray-600 rounded-xs" />
                                        <div className="w-1/4 h-2 bg-gray-400 dark:bg-gray-500 rounded-xs" />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold heading-text">
                                        Üstte (Kart)
                                    </span>
                                    {imagePosition === 'top' && (
                                        <div className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center">
                                            <TbCheck className="w-3 h-3" />
                                        </div>
                                    )}
                                </div>
                                <span className="text-[11px] text-gray-500 mt-0.5">
                                    Geniş resim üstte, detay altta
                                </span>
                            </div>

                            {/* Option: GRID (2'li Kart) */}
                            <div
                                onClick={() => setImagePosition('grid')}
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                                    imagePosition === 'grid'
                                        ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-xs'
                                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900'
                                }`}
                            >
                                <div className="w-full h-20 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2 flex items-center gap-2 mb-3">
                                    <div className="flex-1 h-full flex flex-col justify-between">
                                        <div className="w-full h-8 rounded-md bg-amber-100/90 border-2 border-amber-400 dark:bg-amber-900/40 dark:border-amber-600 flex items-center justify-center text-[8px] text-amber-800 dark:text-amber-200 font-bold">
                                            Resim
                                        </div>
                                        <div className="space-y-1">
                                            <div className="w-4/5 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-xs" />
                                            <div className="w-1/2 h-1 bg-gray-400 dark:bg-gray-500 rounded-xs" />
                                        </div>
                                    </div>
                                    <div className="flex-1 h-full flex flex-col justify-between">
                                        <div className="w-full h-8 rounded-md bg-amber-100/90 border-2 border-amber-400 dark:bg-amber-900/40 dark:border-amber-600 flex items-center justify-center text-[8px] text-amber-800 dark:text-amber-200 font-bold">
                                            Resim
                                        </div>
                                        <div className="space-y-1">
                                            <div className="w-4/5 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-xs" />
                                            <div className="w-1/2 h-1 bg-gray-400 dark:bg-gray-500 rounded-xs" />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold heading-text">
                                        İkili Kart (2'li)
                                    </span>
                                    {imagePosition === 'grid' && (
                                        <div className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center">
                                            <TbCheck className="w-3 h-3" />
                                        </div>
                                    )}
                                </div>
                                <span className="text-[11px] text-gray-500 mt-0.5">
                                    Resim üstte, satırda 2 ürün
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Section 4: Menu Description Area */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700/80 shadow-xs p-6 space-y-5">
                        <div className="flex items-center gap-3.5 pb-4 border-b border-gray-100 dark:border-gray-700/60">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                                <Eye className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold heading-text">
                                    Menü Açıklama Alanı
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    QR menü ürün listeleme sayfasında ürün detay ve açıklama metinlerinin gösterilip gösterilmeyeceğini belirleyin.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Option: Detaylar Görünsün */}
                            <div
                                onClick={() => setShowDescription(true)}
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                                    showDescription
                                        ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-xs'
                                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900'
                                }`}
                            >
                                <div className="w-full h-20 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2.5 flex flex-col justify-between mb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="w-1/2 h-2 bg-gray-400 dark:bg-gray-500 rounded-xs" />
                                        <div className="w-1/5 h-2 bg-primary/70 rounded-xs" />
                                    </div>
                                    <div className="space-y-1.5 my-auto">
                                        <div className="w-full h-1.5 bg-gray-300 dark:bg-gray-600 rounded-xs" />
                                        <div className="w-3/4 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-xs" />
                                    </div>
                                    <div className="w-1/4 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-xs" />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold heading-text">
                                        Detaylar Görünsün
                                    </span>
                                    {showDescription && (
                                        <div className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center">
                                            <TbCheck className="w-3 h-3" />
                                        </div>
                                    )}
                                </div>
                                <span className="text-[11px] text-gray-500 mt-0.5">
                                    Açıklamalar ürün listesinde gösterilir
                                </span>
                            </div>

                            {/* Option: Gözükmesin */}
                            <div
                                onClick={() => setShowDescription(false)}
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                                    !showDescription
                                        ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-xs'
                                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900'
                                }`}
                            >
                                <div className="w-full h-20 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-2.5 flex flex-col justify-between mb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="w-1/2 h-2 bg-gray-400 dark:bg-gray-500 rounded-xs" />
                                        <div className="w-1/5 h-2 bg-primary/70 rounded-xs" />
                                    </div>
                                    <div className="flex items-center justify-center py-2">
                                        <span className="text-[10px] text-gray-400 font-medium italic">
                                            Açıklama gizli
                                        </span>
                                    </div>
                                    <div className="w-1/4 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-xs" />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold heading-text">
                                        Gözükmesin
                                    </span>
                                    {!showDescription && (
                                        <div className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center">
                                            <TbCheck className="w-3 h-3" />
                                        </div>
                                    )}
                                </div>
                                <span className="text-[11px] text-gray-500 mt-0.5">
                                    Detay bilgisi gizlenir, sade görünüm
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Save & Discard Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <Button
                            type="button"
                            disabled={!isDirty || isSaving}
                            onClick={handleDiscard}
                            className="rounded-full"
                        >
                            Vazgeç
                        </Button>
                        <Button
                            variant="solid"
                            type="button"
                            loading={isSaving}
                            disabled={!isDirty && !isSaving}
                            onClick={handleSave}
                            className="rounded-full"
                        >
                            Değişiklikleri Kaydet
                        </Button>
                    </div>

                </div>

                {/* Right Column: Clean Phone Preview */}
                <div className="xl:col-span-5 2xl:col-span-4 xl:sticky xl:top-6 flex items-center justify-center">
                    <QrMenuView
                        menu={previewMenu}
                        restaurant={restaurant}
                        isLivePreview={true}
                    />
                </div>

            </div>
        </div>
    );
}
