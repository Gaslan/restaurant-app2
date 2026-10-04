'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { MenuWithDetails, Restaurant, Product, CategoryWithProducts, ProductTag } from '@/types';
import { TAG_CONFIG } from '@/types';
import {
    Search,
    ArrowLeft,
    X,
    QrCode,
    MapPin,
    Info,
    ChevronRight,
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

    const [activeCategoryId, setActiveCategoryId] = useState<string>(
        categories.length > 0 ? categories[0].id : ''
    );

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

            for (const cat of categories) {
                const el = categoryRefs.current[cat.id] || document.getElementById(`category-${cat.id}`);
                if (el) {
                    const elRect = el.getBoundingClientRect();
                    if (elRect.top - containerRect.top <= navHeight + 35 && elRect.bottom - containerRect.top > navHeight) {
                        currentCatId = cat.id;
                        break;
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
    }, [categories, activeCategoryId]);


    // All products flattened for search
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

    // Appearance configuration
    const imagePosition = restaurant?.appearance?.imagePosition || 'right';

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
                            {restaurant?.logoUrl ? (
                                <img
                                    src={restaurant.logoUrl}
                                    alt={restaurant.name}
                                    className="w-full h-full object-cover"
                                />
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
                            {restaurant?.address && (
                                <button
                                    onClick={() => setIsInfoModalOpen(true)}
                                    className="inline-flex items-center gap-1.5 text-xs text-[#6B6862] hover:text-[#1C1B19] mt-2 cursor-pointer transition-colors"
                                >
                                    <MapPin className="w-3.5 h-3.5 text-[#1C1B19]" />
                                    <span className="truncate max-w-[280px]">{restaurant.address}</span>
                                    <ChevronRight className="w-3 h-3 text-[#6B6862]" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Sticky Category Tabs Bar */}
                    <div className="sticky top-0 z-20 bg-[#F9F9F7]/95 backdrop-blur-md border-b border-[#E7E3DA] py-2.5 px-3">
                        <div
                            ref={navPillContainerRef}
                            className="flex gap-2 overflow-x-auto"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            {categories.map((cat) => {
                                const isActive = activeCategoryId === cat.id;
                                return (
                                    <button
                                        key={cat.id}
                                        ref={(el) => {
                                            navPillRefs.current[cat.id] = el;
                                        }}
                                        onClick={() => handleCategoryClick(cat.id)}
                                        className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap cursor-pointer transition-none select-none ${
                                            isActive
                                                ? 'bg-[#1C1D19] text-[#F9F9F7]'
                                                : 'bg-white text-[#1C1B19] border border-[#E7E3DA]'
                                        }`}
                                    >
                                        {cat.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

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

                                {/* Dishes in this category */}
                                <div className="bg-white px-4.5 divide-y divide-[#E7E3DA] border-y border-[#E7E3DA]">
                                    {(cat.products || [])
                                        .filter((p) => p.active !== false)
                                        .map((product) => {
                                            const hasVariations = product.variations && product.variations.length > 0;
                                            
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
                                                            <div className="w-full h-44 rounded-xl overflow-hidden bg-zinc-100 border border-[#E7E3DA] flex-shrink-0 shadow-xs">
                                                                <img
                                                                    src={product.imageUrl}
                                                                    alt={product.name}
                                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                                                    loading="lazy"
                                                                />
                                                            </div>
                                                        )}
                                                        <div className="w-full min-w-0">
                                                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <span className="font-semibold text-[14px] text-[#1C1B19] group-hover:text-black leading-snug">
                                                                        {product.name}
                                                                    </span>
                                                                    {product.tags && product.tags.length > 0 && (
                                                                        <div className="flex items-center gap-1">
                                                                            {product.tags.slice(0, 2).map(renderTag)}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="text-[13px] font-bold text-[#1C1B19]">
                                                                    {hasVariations ? (
                                                                        <div className="flex items-center gap-1.5 flex-wrap text-xs">
                                                                            {product.variations!.map((v, i) => (
                                                                                <span key={i} className="inline-flex items-center">
                                                                                    {i > 0 && <span className="mx-1 text-[#6B6862]">·</span>}
                                                                                    <span>{formatPrice(v.price)}</span>
                                                                                </span>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        formatPrice(product.price)
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {product.description && (
                                                                <p className="text-xs text-[#6B6862] line-clamp-2 mt-1 leading-relaxed">
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
                                                            <div className="w-[72px] h-[72px] min-w-[72px] rounded-lg overflow-hidden bg-zinc-100 border border-[#E7E3DA] flex-shrink-0 shadow-xs">
                                                                <img
                                                                    src={product.imageUrl}
                                                                    alt={product.name}
                                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                                                    loading="lazy"
                                                                />
                                                            </div>
                                                        )}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className="font-semibold text-[14px] text-[#1C1B19] group-hover:text-black leading-snug">
                                                                    {product.name}
                                                                </span>
                                                                {product.tags && product.tags.length > 0 && (
                                                                    <div className="flex items-center gap-1">
                                                                        {product.tags.slice(0, 2).map(renderTag)}
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {product.description && (
                                                                <p className="text-xs text-[#6B6862] line-clamp-2 mt-1 leading-relaxed">
                                                                    {product.description}
                                                                </p>
                                                            )}

                                                            <div className="mt-2 text-[13px] font-bold text-[#1C1B19]">
                                                                {hasVariations ? (
                                                                    <div className="flex items-center gap-1.5 flex-wrap text-xs">
                                                                        {product.variations!.map((v, i) => (
                                                                            <span key={i} className="inline-flex items-center">
                                                                                {i > 0 && <span className="mx-1 text-[#6B6862]">·</span>}
                                                                                <span>{formatPrice(v.price)}</span>
                                                                            </span>
                                                                        ))}
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
                                                            <span className="font-semibold text-[14px] text-[#1C1B19] group-hover:text-black leading-snug">
                                                                {product.name}
                                                            </span>
                                                            {product.tags && product.tags.length > 0 && (
                                                                <div className="flex items-center gap-1">
                                                                    {product.tags.slice(0, 2).map(renderTag)}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {product.description && (
                                                            <p className="text-xs text-[#6B6862] line-clamp-2 mt-1 leading-relaxed">
                                                                {product.description}
                                                            </p>
                                                        )}

                                                        {/* Price */}
                                                        <div className="mt-2 text-[13px] font-bold text-[#1C1B19]">
                                                            {hasVariations ? (
                                                                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                                                                    {product.variations!.map((v, i) => (
                                                                        <span key={i} className="inline-flex items-center">
                                                                            {i > 0 && <span className="mx-1 text-[#6B6862]">·</span>}
                                                                            <span>{formatPrice(v.price)}</span>
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                formatPrice(product.price)
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Right: Product Thumbnail */}
                                                    {product.imageUrl && (
                                                        <div className="w-[72px] h-[72px] min-w-[72px] rounded-lg overflow-hidden bg-zinc-100 border border-[#E7E3DA] flex-shrink-0 shadow-xs">
                                                            <img
                                                                src={product.imageUrl}
                                                                alt={product.name}
                                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                                                loading="lazy"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Fixed Bottom Footer Bar (Continuously visible like NordQR) */}
                <footer className="flex-shrink-0 bg-white border-t border-[#E7E3DA] py-2.5 px-4 text-center z-10 select-none shadow-[0_-1px_3px_rgba(0,0,0,0.03)]">
                    <div className="flex items-center justify-center gap-1.5 text-xs text-[#6B6862]">
                        <span className="font-semibold text-[#1C1B19]">
                            {restaurant?.name || menu.name || 'Dijital Menü'}
                        </span>
                        <span className="text-[#E7E3DA]">•</span>
                        <span>NordQR Deneyimi</span>
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
                                            {searchResults.map(({ product, categoryName }) => (
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
                                                        <span className="font-semibold text-sm text-[#1C1B19] block">
                                                            {product.name}
                                                        </span>
                                                        {product.description && (
                                                            <p className="text-xs text-[#6B6862] line-clamp-1 mt-0.5">
                                                                {product.description}
                                                            </p>
                                                        )}
                                                        <div className="mt-1.5 text-xs font-bold text-[#1C1B19]">
                                                            {formatPrice(product.price)}
                                                        </div>
                                                    </div>
                                                    {product.imageUrl && (
                                                        <div className="w-14 h-14 rounded-lg overflow-hidden bg-zinc-100 border border-[#E7E3DA] flex-shrink-0">
                                                            <img
                                                                src={product.imageUrl}
                                                                alt={product.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
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
