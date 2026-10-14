'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { MenuWithDetails, Restaurant, Product, CategoryWithProducts } from '@/types';
import { TAG_CONFIG, isDiscountActive, ProductTag } from '@/types';
import {
    Search,
    ArrowLeft,
    X,
    QrCode,
    MapPin,
    Info,
    ChevronRight,
    Utensils,
} from 'lucide-react';
import { generateQRCodeSVG } from '@/lib/qr-utils';
import { QrProductDrawer } from './qr-product-drawer';
import { QrRestaurantDrawer } from './qr-restaurant-drawer';

interface QrMenuViewProps {
    menu: MenuWithDetails;
    restaurant: Restaurant | null;
    isLivePreview?: boolean;
}

export function QrMenuView({ menu, restaurant, isLivePreview = false }: QrMenuViewProps) {
    // Active category for pills navigation
    const categories = useMemo(() => {
        return (menu.categories || []).filter(cat => cat.products && cat.products.length > 0);
    }, [menu.categories]);

    // Appearance configuration (menu-specific with fallback to restaurant/default)
    const imagePosition = menu?.appearance?.imagePosition || restaurant?.appearance?.imagePosition || 'right';
    const showDescription = menu?.appearance?.showDescription ?? restaurant?.appearance?.showDescription ?? true;
    const showPopular = menu?.appearance?.showPopular ?? false;
    const popularLayout = menu?.appearance?.popularLayout || 'grid';
    const showDiscounted = menu?.appearance?.showDiscounted ?? false;
    const discountedLayout = menu?.appearance?.discountedLayout || 'grid';
    const categoryNavLayout = menu?.appearance?.categoryNavLayout || 'text';

    // All products flattened for search & featured lists
    const allProducts = useMemo(() => {
        const items: { product: Product; categoryName: string }[] = [];
        categories.forEach(cat => {
            (cat.products || []).forEach(prod => {
                if (prod.active !== false) {
                    items.push({ product: prod, categoryName: cat.name });
                }
            });
        });
        return items;
    }, [categories]);

    // Popular products: tagged as POPULAR
    const popularProducts = useMemo(() => {
        return allProducts
            .map((item) => item.product)
            .filter(
                (p) => p.tags && (p.tags.includes(ProductTag.POPULAR) || p.tags.includes('POPULAR' as any))
            );
    }, [allProducts]);

    // Discounted products: currently active discount
    const discountedProducts = useMemo(() => {
        return allProducts
            .map((item) => item.product)
            .filter((p) => isDiscountActive(p));
    }, [allProducts]);

    // Navigation tabs (showcases + categories)
    const navTabs = useMemo(() => {
        const tabs: { id: string; name: string; icon?: string; imageUrl?: string | null }[] = [];
        if (showPopular && popularProducts.length > 0) {
            tabs.push({ id: 'popular', name: 'Popüler', icon: '🔥', imageUrl: null });
        }
        if (showDiscounted && discountedProducts.length > 0) {
            tabs.push({ id: 'discounted', name: 'İndirimdekiler', icon: '🏷️', imageUrl: null });
        }
        categories.forEach((cat) => {
            const catImage = cat.imageUrl || (cat.products && cat.products.find(p => p.imageUrl)?.imageUrl) || null;
            tabs.push({ id: cat.id, name: cat.name, imageUrl: catImage });
        });
        return tabs;
    }, [showPopular, popularProducts.length, showDiscounted, discountedProducts.length, categories]);

    const [activeCategoryId, setActiveCategoryId] = useState<string>(
        navTabs.length > 0 ? navTabs[0].id : (categories.length > 0 ? categories[0].id : '')
    );

    // Keep active category in sync if tabs change
    useEffect(() => {
        if (navTabs.length > 0 && (!activeCategoryId || !navTabs.some(t => t.id === activeCategoryId))) {
            setActiveCategoryId(navTabs[0].id);
        }
    }, [navTabs, activeCategoryId]);

    // Search state
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Detail modal state
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [selectedVariationIndex, setSelectedVariationIndex] = useState<number>(0);

    // Restaurant info modal state
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

    // Desktop floating QR code state
    const [qrSvg, setQrSvg] = useState<string>('');
    const [currentUrl, setCurrentUrl] = useState<string>('');

    // Container refs for scrolling
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const navPillContainerRef = useRef<HTMLDivElement>(null);
    const categoryRefs = useRef<Record<string, HTMLElement | null>>({});
    const navPillRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const isManualScrollRef = useRef(false);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Generate QR code for desktop view
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const url = window.location.href;
            setCurrentUrl(url);
            generateQRCodeSVG(url)
                .then(svg => setQrSvg(svg))
                .catch(err => console.error('Failed to generate QR SVG:', err));
        }
    }, []);

    // Format currency helper
    const formatPrice = (amount: number): string => {
        const currency = restaurant?.currency || 'TRY';
        const symbolMap: Record<string, string> = {
            TRY: '₺',
            USD: '$',
            EUR: '€',
        };
        const symbol = symbolMap[currency] || '₺';
        return `${symbol}${amount.toLocaleString('tr-TR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    };

    // Scroll to category
    const handleCategoryClick = (categoryId: string) => {
        setActiveCategoryId(categoryId);
        isManualScrollRef.current = true;

        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }
        scrollTimeoutRef.current = setTimeout(() => {
            isManualScrollRef.current = false;
        }, 700);

        const targetElement = categoryRefs.current[categoryId] || document.getElementById(`category-${categoryId}`);
        const container = scrollContainerRef.current;

        if (targetElement) {
            if (container && (container.scrollHeight > container.clientHeight || container.scrollTop > 0)) {
                const containerRect = container.getBoundingClientRect();
                const targetRect = targetElement.getBoundingClientRect();
                const stickyNav = container.querySelector('.sticky');
                const navHeight = stickyNav ? stickyNav.getBoundingClientRect().height : 52;
                const targetTop = container.scrollTop + (targetRect.top - containerRect.top) - navHeight + 2;

                container.scrollTo({
                    top: Math.max(0, targetTop),
                    behavior: 'smooth'
                });
            } else {
                const stickyNav = document.querySelector('.sticky');
                const navHeight = stickyNav ? stickyNav.getBoundingClientRect().height : 52;
                const targetTop = window.scrollY + targetElement.getBoundingClientRect().top - navHeight + 2;

                window.scrollTo({
                    top: Math.max(0, targetTop),
                    behavior: 'smooth'
                });
            }
        }

        // Center active pill in horizontal category navigation WITHOUT animating or jerking the button
        const pillElement = navPillRefs.current[categoryId];
        const navContainer = navPillContainerRef.current;
        if (navContainer && pillElement) {
            const navRect = navContainer.getBoundingClientRect();
            const pillRect = pillElement.getBoundingClientRect();
            const offset = pillRect.left - navRect.left - (navRect.width / 2) + (pillRect.width / 2);
            navContainer.scrollBy({ left: offset, behavior: 'smooth' });
        }
    };

    // Scroll listener to update active category pill
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            if (isManualScrollRef.current) return;

            const stickyNav = container.querySelector('.sticky');
            const navHeight = stickyNav ? stickyNav.getBoundingClientRect().height : 52;
            const containerRect = container.getBoundingClientRect();

            let currentCatId = activeCategoryId;

            if (container.scrollTop <= 30 && navTabs.length > 0) {
                currentCatId = navTabs[0].id;
            } else {
                for (const tab of navTabs) {
                    const el = categoryRefs.current[tab.id] || document.getElementById(`category-${tab.id}`);
                    if (el) {
                        const elRect = el.getBoundingClientRect();
                        if (elRect.top - containerRect.top <= navHeight + 35 && elRect.bottom - containerRect.top > navHeight) {
                            currentCatId = tab.id;
                            break;
                        }
                    }
                }
            }

            if (currentCatId && currentCatId !== activeCategoryId) {
                setActiveCategoryId(currentCatId);
                const pillElement = navPillRefs.current[currentCatId];
                const navContainer = navPillContainerRef.current;
                if (navContainer && pillElement) {
                    const navRect = navContainer.getBoundingClientRect();
                    const pillRect = pillElement.getBoundingClientRect();
                    const offset = pillRect.left - navRect.left - (navRect.width / 2) + (pillRect.width / 2);
                    navContainer.scrollBy({ left: offset, behavior: 'smooth' });
                }
            }
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, [navTabs, activeCategoryId]);

    // Filtered products for search
    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase().trim();
        return allProducts.filter(({ product, categoryName }) => {
            return (
                product.name.toLowerCase().includes(q) ||
                (product.description && product.description.toLowerCase().includes(q)) ||
                categoryName.toLowerCase().includes(q)
            );
        });
    }, [searchQuery, allProducts]);

    // Render tag badge
    const renderTag = (tag: string) => {
        const upper = tag.toUpperCase() as ProductTag;
        const config = TAG_CONFIG[upper];
        if (!config) return null;
        return (
            <span
                key={tag}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-[#1C1B19] bg-[#E7E3DA]/40 px-1.5 py-0.5 rounded"
                title={config.label}
            >
                <span>{config.icon}</span>
                <span>{config.label}</span>
            </span>
        );
    };

    // Render helper for Popular & Discounted product cards
    const renderFeaturedProductCard = (product: Product, layout: 'grid' | 'scroll', isDiscountSection = false) => {
        const isAvailable = product.available !== false;
        const hasVariations = product.variations && product.variations.length > 0;
        const hasDiscount = isDiscountActive(product);
        const discountPercent = hasDiscount && product.price && product.discount?.discountedPrice
            ? Math.round(((product.price - product.discount.discountedPrice) / product.price) * 100)
            : null;

        const isScroll = layout === 'scroll';

        return (
            <div
                key={product.id}
                onClick={() => {
                    setSelectedProduct(product);
                    setSelectedVariationIndex(0);
                }}
                className={`bg-white rounded-2xl p-2.5 border border-[#E7E3DA] shadow-xs cursor-pointer group active:scale-[0.98] transition-all flex flex-col justify-between ${
                    isScroll ? 'w-[145px] sm:w-[155px] shrink-0 snap-start' : 'w-full'
                }`}
            >
                <div>
                    {/* Product Image */}
                    <div className={`w-full ${isScroll ? 'h-24' : 'h-28'} rounded-xl overflow-hidden bg-zinc-100 border border-[#E7E3DA] relative mb-2`}>
                        {product.imageUrl ? (
                            <img
                                src={product.imageUrl}
                                alt={product.name}
                                className={`w-full h-full object-cover transition-transform duration-200 ${
                                    isAvailable ? 'group-hover:scale-105' : 'grayscale opacity-75'
                                }`}
                                loading="lazy"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-300">
                                <Utensils className="w-7 h-7" />
                            </div>
                        )}

                        {/* Top Badges */}
                        <div className="absolute top-1.5 left-1.5 flex flex-col gap-1 items-start z-10 pointer-events-none">
                            {isDiscountSection && discountPercent && discountPercent > 0 ? (
                                <span className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs">
                                    %{discountPercent} İndirim
                                </span>
                            ) : (
                                product.tags && product.tags.slice(0, 1).map((t) => (
                                    <span key={t} className="bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs">
                                        {TAG_CONFIG[t]?.label || t}
                                    </span>
                                ))
                            )}
                        </div>

                        {/* Sold out overlay */}
                        {!isAvailable && (
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center p-1 pointer-events-none">
                                <span className="bg-zinc-900/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm tracking-wider uppercase">
                                    Tükendi
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Product Details */}
                    <div>
                        <h4 className={`font-semibold text-xs leading-snug line-clamp-1 ${
                            isAvailable ? 'text-[#1C1B19] group-hover:text-black' : 'text-zinc-400'
                        }`}>
                            {product.name}
                        </h4>
                        {showDescription && product.description && (
                            <p className={`text-[10px] line-clamp-1 mt-0.5 leading-relaxed ${
                                isAvailable ? 'text-[#6B6862]' : 'text-zinc-400/80'
                            }`}>
                                {product.description}
                            </p>
                        )}
                    </div>
                </div>

                {/* Price */}
                <div className="mt-2 pt-1.5 border-t border-gray-100 flex items-center justify-between">
                    {hasVariations ? (
                        <div className="flex items-center gap-1 text-[11px] font-bold text-[#1C1B19]">
                            <span>{formatPrice(product.variations![0].price)}</span>
                            {product.variations!.length > 1 && (
                                <span className="text-[9px] font-normal text-[#6B6862]">'den</span>
                            )}
                        </div>
                    ) : hasDiscount ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-emerald-700 font-bold text-xs">
                                {formatPrice(product.discount!.discountedPrice)}
                            </span>
                            <span className="text-[10px] text-zinc-400 line-through font-normal">
                                {formatPrice(product.price)}
                            </span>
                        </div>
                    ) : (
                        <span className="text-xs font-bold text-[#1C1B19]">
                            {formatPrice(product.price)}
                        </span>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className={isLivePreview ? "w-full flex items-center justify-center font-sans py-2" : "min-h-dvh bg-[#e4e4e7] flex items-center justify-center font-sans md:py-6 md:px-4"}>
            {/* Phone Mockup Frame */}
            <div className={isLivePreview 
                ? "w-full max-w-[380px] h-[720px] bg-[#F9F9F7] text-[#1C1B19] rounded-[36px] shadow-2xl overflow-hidden flex flex-col relative border-[7px] border-zinc-900 ring-1 ring-zinc-400/50" 
                : "w-full max-w-[420px] h-dvh md:h-[880px] md:max-h-[94dvh] bg-[#F9F9F7] text-[#1C1B19] md:rounded-[28px] md:shadow-2xl overflow-hidden flex flex-col relative border-0 md:border md:border-[#E7E3DA]"
            }>
                {isLivePreview && (
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-3.5 bg-zinc-900 rounded-full z-30 pointer-events-none" />
                )}
                
                {/* Scrollable Container */}
                <div
                    ref={scrollContainerRef}
                    className="flex-1 overflow-y-auto relative"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {/* Hero Section */}
                    <div className="relative w-full bg-[#1C1D19] overflow-hidden">
                        {/* Hero Image */}
                        <div className="relative w-full aspect-[414/230] bg-zinc-900">
                            {restaurant?.appearance?.headerImageUrl || restaurant?.logoUrl ? (
                                <div className="relative w-full h-full">
                                    <img
                                        src={restaurant.appearance?.headerImageUrl || restaurant.logoUrl!}
                                        alt={restaurant.name}
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />
                                </div>
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-zinc-800 via-neutral-900 to-black flex items-center justify-center p-6 text-center">
                                    <div className="text-white/80">
                                        <div className="w-16 h-16 mx-auto mb-2 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center text-3xl font-serif">
                                            {restaurant?.name?.charAt(0) || menu.name.charAt(0)}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Top Action Overlay: Search & Info buttons */}
                            <div className="absolute top-3.5 right-3.5 flex items-center gap-2 z-10">
                                <button
                                    onClick={() => setIsSearchOpen(true)}
                                    className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer"
                                    aria-label="Arama yap"
                                >
                                    <Search className="w-5 h-5 text-white" />
                                </button>
                                {restaurant && (
                                    <button
                                        onClick={() => setIsInfoModalOpen(true)}
                                        className="w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer"
                                        aria-label="Restoran bilgileri"
                                    >
                                        <Info className="w-5 h-5 text-white" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Restaurant Name & Subtitle */}
                        <div className="px-4.5 pt-4 pb-3 bg-[#F9F9F7]">
                            <h1 className="text-2xl font-bold tracking-tight text-[#1C1B19] leading-tight">
                                {restaurant?.name || menu.name}
                            </h1>
                            {restaurant?.description && (
                                <p className="text-xs text-[#6B6862] mt-1 leading-relaxed line-clamp-2">
                                    {restaurant.description}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Sticky Category Tabs Bar */}
                    <div className="sticky top-0 z-20 bg-[#F9F9F7]/95 backdrop-blur-md border-b border-[#E7E3DA] py-0.5 px-1.5">
                        <div
                            ref={navPillContainerRef}
                            className={`flex overflow-x-auto py-1.5 px-1.5 ${
                                categoryNavLayout === 'image'
                                    ? 'gap-2.5 items-center'
                                    : categoryNavLayout === 'vertical'
                                    ? 'gap-1.5 items-start'
                                    : 'gap-2 items-center'
                            }`}
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            {navTabs.map((tab) => {
                                const isActive = activeCategoryId === tab.id;

                                if (categoryNavLayout === 'image') {
                                    return (
                                        <button
                                            key={tab.id}
                                            ref={(el) => {
                                                navPillRefs.current[tab.id] = el;
                                            }}
                                            onClick={() => handleCategoryClick(tab.id)}
                                            title={tab.name}
                                            aria-label={tab.name}
                                            className={`w-11 h-11 rounded-full shrink-0 flex items-center justify-center cursor-pointer transition-all select-none relative overflow-hidden ${
                                                isActive
                                                    ? 'ring-2 ring-[#1C1D19] ring-offset-2 ring-offset-[#F9F9F7] scale-105 shadow-sm'
                                                    : 'border border-[#E7E3DA] bg-white opacity-85 hover:opacity-100 hover:scale-102'
                                            }`}
                                        >
                                            {tab.icon ? (
                                                <span className={`text-base flex items-center justify-center w-full h-full ${
                                                    tab.id === 'popular' ? 'bg-amber-500/15' : 'bg-emerald-500/15'
                                                }`}>
                                                    {tab.icon}
                                                </span>
                                            ) : tab.imageUrl ? (
                                                <img
                                                    src={tab.imageUrl}
                                                    alt={tab.name}
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-[#E7E3DA]/40 flex items-center justify-center text-[#1C1B19]">
                                                    <Utensils className="w-4 h-4 opacity-70" />
                                                </div>
                                            )}
                                        </button>
                                    );
                                }

                                if (categoryNavLayout === 'both') {
                                    return (
                                        <button
                                            key={tab.id}
                                            ref={(el) => {
                                                navPillRefs.current[tab.id] = el;
                                            }}
                                            onClick={() => handleCategoryClick(tab.id)}
                                            className={`pl-1.5 pr-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-none select-none flex items-center gap-2 ${
                                                isActive
                                                    ? 'bg-[#1C1D19] text-[#F9F9F7]'
                                                    : 'bg-white text-[#1C1B19] border border-[#E7E3DA]'
                                            }`}
                                        >
                                            {tab.icon ? (
                                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${
                                                    isActive
                                                        ? 'bg-white/20'
                                                        : tab.id === 'popular' ? 'bg-amber-500/15' : 'bg-emerald-500/15'
                                                }`}>
                                                    {tab.icon}
                                                </span>
                                            ) : tab.imageUrl ? (
                                                <img
                                                    src={tab.imageUrl}
                                                    alt={tab.name}
                                                    className={`w-6 h-6 rounded-full object-cover shrink-0 ${
                                                        isActive ? 'ring-1 ring-white/40' : 'ring-1 ring-[#E7E3DA]'
                                                    }`}
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                                                    isActive ? 'bg-white/20 text-white' : 'bg-[#E7E3DA]/60 text-[#1C1B19]'
                                                }`}>
                                                    <Utensils className="w-3 h-3" />
                                                </span>
                                            )}
                                            <span>{tab.name}</span>
                                        </button>
                                    );
                                }

                                if (categoryNavLayout === 'vertical') {
                                    return (
                                        <button
                                            key={tab.id}
                                            ref={(el) => {
                                                navPillRefs.current[tab.id] = el;
                                            }}
                                            onClick={() => handleCategoryClick(tab.id)}
                                            className="flex flex-col items-center justify-center shrink-0 cursor-pointer transition-all select-none px-1.5 py-1 group"
                                        >
                                            <div className={`w-12 h-12 rounded-full overflow-hidden flex items-center justify-center transition-all ${
                                                isActive
                                                    ? 'ring-2 ring-[#1C1D19] ring-offset-2 ring-offset-[#F9F9F7] scale-105 shadow-sm'
                                                    : 'border border-[#E7E3DA] bg-white opacity-85 group-hover:opacity-100 group-hover:scale-102'
                                            }`}>
                                                {tab.icon ? (
                                                    <span className={`text-base flex items-center justify-center w-full h-full ${
                                                        tab.id === 'popular' ? 'bg-amber-500/15' : 'bg-emerald-500/15'
                                                    }`}>
                                                        {tab.icon}
                                                    </span>
                                                ) : tab.imageUrl ? (
                                                    <img
                                                        src={tab.imageUrl}
                                                        alt={tab.name}
                                                        className="w-full h-full object-cover"
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-[#E7E3DA]/40 flex items-center justify-center text-[#1C1B19]">
                                                        <Utensils className="w-4 h-4 opacity-70" />
                                                    </div>
                                                )}
                                            </div>
                                            <span className={`text-[11px] font-semibold tracking-tight text-center max-w-[76px] truncate mt-1.5 transition-colors ${
                                                isActive ? 'text-[#1C1B19] font-bold' : 'text-[#6B6862]'
                                            }`}>
                                                {tab.name}
                                            </span>
                                        </button>
                                    );
                                }

                                // Default: 'text' (Sadece Yazı)
                                return (
                                    <button
                                        key={tab.id}
                                        ref={(el) => {
                                            navPillRefs.current[tab.id] = el;
                                        }}
                                        onClick={() => handleCategoryClick(tab.id)}
                                        className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-none select-none flex items-center gap-1.5 ${
                                            isActive
                                                ? 'bg-[#1C1D19] text-[#F9F9F7]'
                                                : 'bg-white text-[#1C1B19] border border-[#E7E3DA]'
                                        }`}
                                    >
                                        {tab.icon && <span className="text-xs">{tab.icon}</span>}
                                        <span>{tab.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Featured Section: Popüler Ürünler */}
                    {showPopular && popularProducts.length > 0 && (
                        <div
                            id="category-popular"
                            ref={(el) => {
                                categoryRefs.current['popular'] = el;
                            }}
                            style={{ scrollMarginTop: '56px' }}
                            className="scroll-mt-14 border-b border-[#E7E3DA] bg-gradient-to-b from-[#F9F9F7] to-[#F4F2EC]/40 pt-3 pb-3"
                        >
                            <div className="px-4.5 pb-2.5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center text-xs font-bold">
                                        🔥
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-[#1C1B19] tracking-tight">
                                            Popüler Ürünler
                                        </h3>
                                    </div>
                                </div>
                                <span className="text-[10px] text-[#6B6862] font-semibold bg-white px-2 py-0.5 rounded-full border border-[#E7E3DA]">
                                    {popularProducts.length} ürün
                                </span>
                            </div>

                            {popularLayout === 'scroll' ? (
                                <div
                                    className="flex gap-2.5 overflow-x-auto px-4.5 pb-1 pt-0.5"
                                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                >
                                    {popularProducts.map((p) => renderFeaturedProductCard(p, 'scroll'))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2.5 px-4.5 pb-1 pt-0.5">
                                    {popularProducts.map((p) => renderFeaturedProductCard(p, 'grid'))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Featured Section: İndirimdeki Ürünler */}
                    {showDiscounted && discountedProducts.length > 0 && (
                        <div
                            id="category-discounted"
                            ref={(el) => {
                                categoryRefs.current['discounted'] = el;
                            }}
                            style={{ scrollMarginTop: '56px' }}
                            className="scroll-mt-14 border-b border-[#E7E3DA] bg-gradient-to-b from-[#F9F9F7] to-emerald-50/20 pt-3 pb-3"
                        >
                            <div className="px-4.5 pb-2.5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-xs font-bold">
                                        🏷️
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-[#1C1B19] tracking-tight">
                                            İndirimdeki Ürünler
                                        </h3>
                                    </div>
                                </div>
                                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                    {discountedProducts.length} fırsat
                                </span>
                            </div>

                            {discountedLayout === 'scroll' ? (
                                <div
                                    className="flex gap-2.5 overflow-x-auto px-4.5 pb-1 pt-0.5"
                                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                >
                                    {discountedProducts.map((p) => renderFeaturedProductCard(p, 'scroll', true))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2.5 px-4.5 pb-1 pt-0.5">
                                    {discountedProducts.map((p) => renderFeaturedProductCard(p, 'grid', true))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Category Sections & Dish List */}
                    <div className="divide-y divide-[#E7E3DA]">
                        {categories.map((cat) => (
                            <div
                                key={cat.id}
                                id={`category-${cat.id}`}
                                ref={(el) => {
                                    categoryRefs.current[cat.id] = el;
                                }}
                                style={{ scrollMarginTop: '56px' }}
                                className="scroll-mt-14"
                            >
                                {/* Category Header */}
                                {cat.imageUrl && cat.imageUrl.trim() ? (
                                    <div className="relative w-full h-36 sm:h-40 overflow-hidden flex flex-col justify-end p-4.5 bg-zinc-900 select-none">
                                        <img
                                            src={cat.imageUrl}
                                            alt={cat.name}
                                            className="absolute inset-0 w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
                                        <div className="relative z-10">
                                            <h2 className="text-xl font-bold text-white tracking-tight drop-shadow-sm">
                                                {cat.name}
                                            </h2>
                                            {cat.description && (
                                                <p className="text-xs text-white/90 mt-1 line-clamp-2 leading-relaxed drop-shadow-sm">
                                                    {cat.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="px-4.5 pt-5 pb-2 bg-[#F9F9F7]">
                                        <h2 className="text-lg font-bold text-[#1C1B19] tracking-tight">
                                            {cat.name}
                                        </h2>
                                        {cat.description && (
                                            <p className="text-xs text-[#6B6862] mt-0.5">
                                                {cat.description}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Dishes in this category */}
                                {imagePosition === 'grid' ? (
                                    <div className="bg-white px-4 py-4 grid grid-cols-2 gap-x-3.5 gap-y-4 border-y border-[#E7E3DA]">
                                        {(cat.products || [])
                                            .filter((p) => p.active !== false)
                                            .map((product) => {
                                                const hasVariations = product.variations && product.variations.length > 0;
                                                const isAvailable = product.available !== false;
                                                return (
                                                    <div
                                                        key={product.id}
                                                        onClick={() => {
                                                            setSelectedProduct(product);
                                                            setSelectedVariationIndex(0);
                                                        }}
                                                        className="flex flex-col justify-between cursor-pointer group active:opacity-75 transition-opacity"
                                                    >
                                                        <div>
                                                            {product.imageUrl && (
                                                                <div className="w-full h-32 rounded-xl overflow-hidden bg-zinc-100 border border-[#E7E3DA] mb-2 flex-shrink-0 relative">
                                                                    <img
                                                                        src={product.imageUrl}
                                                                        alt={product.name}
                                                                        className={`w-full h-full object-cover transition-transform duration-200 ${
                                                                            isAvailable ? 'group-hover:scale-105' : 'grayscale opacity-75'
                                                                        }`}
                                                                        loading="lazy"
                                                                    />
                                                                    {!isAvailable && (
                                                                        <div className="absolute inset-0 bg-black/25 flex items-center justify-center p-1 pointer-events-none">
                                                                            <span className="bg-zinc-900/90 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-sm tracking-wider uppercase">
                                                                                Tükendi
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                            <div className="w-full min-w-0">
                                                                <div className="flex items-start gap-1.5 flex-wrap">
                                                                    <span className={`font-semibold text-[13px] leading-snug line-clamp-2 ${
                                                                        isAvailable ? 'text-[#1C1B19] group-hover:text-black' : 'text-zinc-400'
                                                                    }`}>
                                                                        {product.name}
                                                                    </span>
                                                                    {!product.imageUrl && !isAvailable && (
                                                                        <span className="bg-zinc-100 text-zinc-500 border border-zinc-200 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
                                                                            Tükendi
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {product.tags && product.tags.length > 0 && (
                                                                    <div className={`flex items-center gap-1 mt-1 ${!isAvailable ? 'opacity-50 grayscale' : ''}`}>
                                                                        {product.tags.slice(0, 1).map(renderTag)}
                                                                    </div>
                                                                )}
                                                                {showDescription && product.description && (
                                                                    <p className={`text-[11px] line-clamp-2 mt-1 leading-relaxed ${
                                                                        isAvailable ? 'text-[#6B6862]' : 'text-zinc-400/80'
                                                                    }`}>
                                                                        {product.description}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <div className={`mt-2 text-[13px] font-bold ${
                                                            isAvailable ? 'text-[#1C1B19]' : 'text-zinc-400'
                                                        }`}>
                                                            {hasVariations ? (
                                                                <div className="flex items-center gap-1 text-xs">
                                                                    <span>{formatPrice(product.variations![0].price)}</span>
                                                                    {product.variations!.length > 1 && (
                                                                        <span className={`text-[10px] font-normal ${isAvailable ? 'text-[#6B6862]' : 'text-zinc-400'}`}>'den</span>
                                                                    )}
                                                                </div>
                                                            ) : isDiscountActive(product) ? (
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <span className="text-emerald-700 font-bold">{formatPrice(product.discount!.discountedPrice)}</span>
                                                                    <span className="text-[11px] text-zinc-400 line-through font-normal">{formatPrice(product.price)}</span>
                                                                </div>
                                                            ) : (
                                                                formatPrice(product.price)
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                ) : (
                                    <div className="bg-white px-4.5 divide-y divide-[#E7E3DA] border-y border-[#E7E3DA]">
                                        {(cat.products || [])
                                            .filter((p) => p.active !== false)
                                            .map((product) => {
                                                const hasVariations = product.variations && product.variations.length > 0;
                                                const isAvailable = product.available !== false;
                                            
                                            // Top image position layout
                                            if (imagePosition === 'top') {
                                                return (
                                                    <div
                                                        key={product.id}
                                                        onClick={() => {
                                                            setSelectedProduct(product);
                                                            setSelectedVariationIndex(0);
                                                        }}
                                                        className="py-3.5 flex flex-col gap-2.5 cursor-pointer group active:bg-zinc-50 transition-colors"
                                                    >
                                                        {product.imageUrl && (
                                                            <div className="w-full h-44 rounded-xl overflow-hidden bg-zinc-100 border border-[#E7E3DA] flex-shrink-0 shadow-xs relative">
                                                                <img
                                                                    src={product.imageUrl}
                                                                    alt={product.name}
                                                                    className={`w-full h-full object-cover transition-transform duration-200 ${
                                                                        isAvailable ? 'group-hover:scale-105' : 'grayscale opacity-75'
                                                                    }`}
                                                                    loading="lazy"
                                                                />
                                                                {!isAvailable && (
                                                                    <div className="absolute inset-0 bg-black/25 flex items-center justify-center p-2 pointer-events-none">
                                                                        <span className="bg-zinc-900/90 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md tracking-wider uppercase">
                                                                            Tükendi
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                        <div className="w-full min-w-0">
                                                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <span className={`font-semibold text-[16px] leading-snug ${
                                                                        isAvailable ? 'text-[#1C1B19] group-hover:text-black' : 'text-zinc-400'
                                                                    }`}>
                                                                        {product.name}
                                                                    </span>
                                                                    {!product.imageUrl && !isAvailable && (
                                                                        <span className="bg-zinc-100 text-zinc-500 border border-zinc-200 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
                                                                            Tükendi
                                                                        </span>
                                                                    )}
                                                                    {product.tags && product.tags.length > 0 && (
                                                                        <div className={`flex items-center gap-1 ${!isAvailable ? 'opacity-50 grayscale' : ''}`}>
                                                                            {product.tags.slice(0, 2).map(renderTag)}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className={`text-[13px] font-bold ${isAvailable ? 'text-[#1C1B19]' : 'text-zinc-400'}`}>
                                                                    {hasVariations ? (
                                                                        <div className="flex items-center gap-1.5 flex-wrap text-xs">
                                                                            {product.variations!.map((v, i) => (
                                                                                <span key={i} className="inline-flex items-center">
                                                                                    {i > 0 && <span className={`mx-1 ${isAvailable ? 'text-[#6B6862]' : 'text-zinc-400'}`}>·</span>}
                                                                                    <span>{formatPrice(v.price)}</span>
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    ) : isDiscountActive(product) ? (
                                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                                            <span className="text-emerald-700 font-bold">{formatPrice(product.discount!.discountedPrice)}</span>
                                                                            <span className="text-[11px] text-zinc-400 line-through font-normal">{formatPrice(product.price)}</span>
                                                                        </div>
                                                                    ) : (
                                                                        formatPrice(product.price)
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {showDescription && product.description && (
                                                                <p className={`text-xs line-clamp-2 mt-1 leading-relaxed ${
                                                                    isAvailable ? 'text-[#6B6862]' : 'text-zinc-400/80'
                                                                }`}>
                                                                    {product.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            // Left image position layout
                                            if (imagePosition === 'left') {
                                                return (
                                                    <div
                                                        key={product.id}
                                                        onClick={() => {
                                                            setSelectedProduct(product);
                                                            setSelectedVariationIndex(0);
                                                        }}
                                                        className="py-3.5 flex items-center gap-3 cursor-pointer group active:bg-zinc-50 transition-colors"
                                                    >
                                                        {product.imageUrl && (
                                                            <div className="w-[96px] h-[96px] min-w-[96px] rounded-lg overflow-hidden bg-zinc-100 border border-[#E7E3DA] flex-shrink-0 shadow-xs relative">
                                                                <img
                                                                    src={product.imageUrl}
                                                                    alt={product.name}
                                                                    className={`w-full h-full object-cover transition-transform duration-200 ${
                                                                        isAvailable ? 'group-hover:scale-105' : 'grayscale opacity-75'
                                                                    }`}
                                                                    loading="lazy"
                                                                />
                                                                {!isAvailable && (
                                                                    <div className="absolute inset-0 bg-black/30 flex items-center justify-center p-1 pointer-events-none">
                                                                        <span className="bg-zinc-900/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-xs tracking-wider uppercase">
                                                                            Tükendi
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className={`font-semibold text-[16px] leading-snug ${
                                                                    isAvailable ? 'text-[#1C1B19] group-hover:text-black' : 'text-zinc-400'
                                                                }`}>
                                                                    {product.name}
                                                                </span>
                                                                {!product.imageUrl && !isAvailable && (
                                                                    <span className="bg-zinc-100 text-zinc-500 border border-zinc-200 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
                                                                        Tükendi
                                                                    </span>
                                                                )}
                                                                {product.tags && product.tags.length > 0 && (
                                                                    <div className={`flex items-center gap-1 ${!isAvailable ? 'opacity-50 grayscale' : ''}`}>
                                                                        {product.tags.slice(0, 2).map(renderTag)}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {showDescription && product.description && (
                                                                <p className={`text-xs line-clamp-2 mt-1 leading-relaxed ${
                                                                    isAvailable ? 'text-[#6B6862]' : 'text-zinc-400/80'
                                                                }`}>
                                                                    {product.description}
                                                                </p>
                                                            )}

                                                            <div className={`mt-2 text-[13px] font-bold ${isAvailable ? 'text-[#1C1B19]' : 'text-zinc-400'}`}>
                                                                {hasVariations ? (
                                                                    <div className="flex items-center gap-1.5 flex-wrap text-xs">
                                                                        {product.variations!.map((v, i) => (
                                                                            <span key={i} className="inline-flex items-center">
                                                                                {i > 0 && <span className={`mx-1 ${isAvailable ? 'text-[#6B6862]' : 'text-zinc-400'}`}>·</span>}
                                                                                <span>{formatPrice(v.price)}</span>
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                ) : isDiscountActive(product) ? (
                                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                                        <span className="text-emerald-700 font-bold">{formatPrice(product.discount!.discountedPrice)}</span>
                                                                        <span className="text-[11px] text-zinc-400 line-through font-normal">{formatPrice(product.price)}</span>
                                                                    </div>
                                                                ) : (
                                                                    formatPrice(product.price)
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            // Default: Right image position layout
                                            return (
                                                <div
                                                    key={product.id}
                                                    onClick={() => {
                                                        setSelectedProduct(product);
                                                        setSelectedVariationIndex(0);
                                                    }}
                                                    className="py-3.5 flex justify-between items-center gap-3 cursor-pointer group active:bg-zinc-50 transition-colors"
                                                >
                                                    {/* Left: Product Information */}
                                                    <div className="flex-1 min-w-0 pr-1">
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <span className={`font-semibold text-[16px] leading-snug ${
                                                                isAvailable ? 'text-[#1C1B19] group-hover:text-black' : 'text-zinc-400'
                                                            }`}>
                                                                {product.name}
                                                            </span>
                                                            {!product.imageUrl && !isAvailable && (
                                                                <span className="bg-zinc-100 text-zinc-500 border border-zinc-200 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">
                                                                    Tükendi
                                                                </span>
                                                            )}
                                                            {product.tags && product.tags.length > 0 && (
                                                                <div className={`flex items-center gap-1 ${!isAvailable ? 'opacity-50 grayscale' : ''}`}>
                                                                    {product.tags.slice(0, 2).map(renderTag)}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {showDescription && product.description && (
                                                            <p className={`text-xs line-clamp-2 mt-1 leading-relaxed ${
                                                                isAvailable ? 'text-[#6B6862]' : 'text-zinc-400/80'
                                                            }`}>
                                                                {product.description}
                                                            </p>
                                                        )}

                                                        {/* Price */}
                                                        <div className={`mt-2 text-[13px] font-bold ${isAvailable ? 'text-[#1C1B19]' : 'text-zinc-400'}`}>
                                                            {hasVariations ? (
                                                                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                                                                    {product.variations!.map((v, i) => (
                                                                        <span key={i} className="inline-flex items-center">
                                                                            {i > 0 && <span className={`mx-1 ${isAvailable ? 'text-[#6B6862]' : 'text-zinc-400'}`}>·</span>}
                                                                            <span>{formatPrice(v.price)}</span>
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            ) : isDiscountActive(product) ? (
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <span className="text-emerald-700 font-bold">{formatPrice(product.discount!.discountedPrice)}</span>
                                                                    <span className="text-[11px] text-zinc-400 line-through font-normal">{formatPrice(product.price)}</span>
                                                                </div>
                                                            ) : (
                                                                formatPrice(product.price)
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Right: Product Thumbnail */}
                                                    {product.imageUrl && (
                                                        <div className="w-[96px] h-[96px] min-w-[96px] rounded-lg overflow-hidden bg-zinc-100 border border-[#E7E3DA] flex-shrink-0 shadow-xs relative">
                                                            <img
                                                                src={product.imageUrl}
                                                                alt={product.name}
                                                                className={`w-full h-full object-cover transition-transform duration-200 ${
                                                                    isAvailable ? 'group-hover:scale-105' : 'grayscale opacity-75'
                                                                }`}
                                                                loading="lazy"
                                                            />
                                                            {!isAvailable && (
                                                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center p-1 pointer-events-none">
                                                                    <span className="bg-zinc-900/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-xs tracking-wider uppercase">
                                                                        Tükendi
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Fixed Bottom Footer Bar */}
                <footer className="flex-shrink-0 bg-white border-t border-[#E7E3DA] py-2.5 px-4 text-center z-10 select-none shadow-[0_-1px_3px_rgba(0,0,0,0.03)]">
                    <div className="flex items-center justify-center gap-1.5 text-xs text-[#6B6862]">
                        <span className="font-semibold text-[#1C1B19]">
                            {restaurant?.name || menu.name || 'Dijital Menü'}
                        </span>
                    </div>
                </footer>

                {/* Search Full Screen / Drawer */}
                {isSearchOpen && (
                    <div className="absolute inset-0 z-40 bg-[#F9F9F7] flex flex-col animate-in fade-in slide-in-from-bottom duration-200">
                        {/* Search Header */}
                        <div className="bg-white border-b border-[#E7E3DA] px-3 py-2.5 flex items-center gap-3">
                            <button
                                onClick={() => {
                                    setIsSearchOpen(false);
                                    setSearchQuery('');
                                }}
                                className="p-2 rounded-full text-[#6B6862] hover:text-[#1C1B19] hover:bg-zinc-100 cursor-pointer"
                                aria-label="Geri"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Menüde ara..."
                                    autoFocus
                                    className="w-full bg-transparent text-sm text-[#1C1B19] placeholder-[#6B6862] outline-none py-1"
                                />
                            </div>
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="p-1.5 rounded-full text-[#6B6862] hover:text-[#1C1B19] cursor-pointer"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Search Results */}
                        <div
                            className="flex-1 overflow-y-auto px-4 py-3"
                            style={{ scrollbarWidth: 'none' }}
                        >
                            {searchQuery.trim() ? (
                                <>
                                    <div className="text-xs text-[#6B6862] mb-3">
                                        "{searchQuery}" için {searchResults.length} sonuç bulundu
                                    </div>
                                    {searchResults.length > 0 ? (
                                        <div className="bg-white rounded-xl border border-[#E7E3DA] divide-y divide-[#E7E3DA] px-4">
                                            {searchResults.map(({ product, categoryName }) => {
                                                const isAvailable = product.available !== false;
                                                return (
                                                    <div
                                                        key={product.id}
                                                        onClick={() => {
                                                            setSelectedProduct(product);
                                                            setSelectedVariationIndex(0);
                                                        }}
                                                        className="py-3 flex justify-between items-center gap-3 cursor-pointer group active:bg-zinc-50"
                                                    >
                                                        <div className="flex-1 min-w-0">
                                                            <span className="text-[11px] text-[#6B6862] block mb-0.5">
                                                                {categoryName}
                                                            </span>
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className={`font-semibold text-sm block ${
                                                                    isAvailable ? 'text-[#1C1B19]' : 'text-zinc-400'
                                                                }`}>
                                                                    {product.name}
                                                                </span>
                                                                {!isAvailable && !product.imageUrl && (
                                                                    <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-600">
                                                                        Tükendi
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {showDescription && product.description && (
                                                                <p className={`text-xs line-clamp-1 mt-0.5 ${
                                                                    isAvailable ? 'text-[#6B6862]' : 'text-zinc-400/80'
                                                                }`}>
                                                                    {product.description}
                                                                </p>
                                                            )}
                                                            <div className={`mt-1.5 text-xs font-bold ${
                                                                isAvailable ? 'text-[#1C1B19]' : 'text-zinc-400'
                                                            }`}>
                                                                {isDiscountActive(product) ? (
                                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                                        <span className="text-emerald-700 font-bold">{formatPrice(product.discount!.discountedPrice)}</span>
                                                                        <span className="text-[10px] text-zinc-400 line-through font-normal">{formatPrice(product.price)}</span>
                                                                    </div>
                                                                ) : (
                                                                    formatPrice(product.price)
                                                                )}
                                                            </div>
                                                        </div>
                                                        {product.imageUrl && (
                                                            <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-zinc-100 border border-[#E7E3DA] flex-shrink-0">
                                                                <img
                                                                    src={product.imageUrl}
                                                                    alt={product.name}
                                                                    className={`w-full h-full object-cover ${
                                                                        !isAvailable ? 'grayscale opacity-75' : ''
                                                                    }`}
                                                                />
                                                                {!isAvailable && (
                                                                    <div className="absolute inset-0 bg-black/35 flex items-center justify-center p-1 pointer-events-none">
                                                                        <span className="bg-zinc-900/90 text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-xs uppercase tracking-wider text-center">
                                                                            Tükendi
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="py-12 text-center text-sm text-[#6B6862]">
                                            Aradığınız kriterlere uygun ürün bulunamadı.
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="py-12 text-center">
                                    <Search className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                                    <p className="text-xs text-[#6B6862]">
                                        Menüdeki ürünleri veya içerikleri aramak için yazın
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Product Detail Bottom Sheet / Drawer with NordQR handle gestures & animations */}
                <QrProductDrawer
                    isOpen={!!selectedProduct}
                    onClose={() => setSelectedProduct(null)}
                    product={selectedProduct}
                    formatPrice={formatPrice}
                    renderTag={renderTag}
                    selectedVariationIndex={selectedVariationIndex}
                    setSelectedVariationIndex={setSelectedVariationIndex}
                />


                {/* Restaurant Info Bottom Sheet Drawer */}
                <QrRestaurantDrawer
                    isOpen={isInfoModalOpen}
                    onClose={() => setIsInfoModalOpen(false)}
                    restaurant={restaurant}
                />
            </div>

            {/* Desktop Floating QR Code Widget (Visible on md+ screens like NordQR) */}
            {!isLivePreview && (
                <div className="hidden md:flex fixed bottom-6 right-6 z-30 flex-col items-center">
                    <div className="bg-white p-3.5 rounded-2xl shadow-xl border border-zinc-200/90 text-center max-w-[150px] transition-transform hover:scale-105">
                        {qrSvg ? (
                            <div
                                className="w-28 h-28 mx-auto [&>svg]:w-full [&>svg]:h-full"
                                dangerouslySetInnerHTML={{ __html: qrSvg }}
                            />
                        ) : (
                            <div className="w-28 h-28 bg-zinc-100 rounded-lg flex items-center justify-center">
                                <QrCode className="w-8 h-8 text-zinc-400 animate-pulse" />
                            </div>
                        )}
                        <p className="text-[11px] font-medium text-[#6B6862] mt-2 leading-tight">
                            Menüyü telefonunuzda görmek için QR'ı tarayın.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
