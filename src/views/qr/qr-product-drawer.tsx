'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Product } from '@/types';
import { Flame, Timer, AlertCircle } from 'lucide-react';

interface QrProductDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product | null;
    formatPrice: (amount: number) => string;
    renderTag: (tag: string) => React.ReactNode;
    selectedVariationIndex: number;
    setSelectedVariationIndex: (idx: number) => void;
}

export function QrProductDrawer({
    isOpen,
    onClose,
    product,
    formatPrice,
    renderTag,
    selectedVariationIndex,
    setSelectedVariationIndex,
}: QrProductDrawerProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);

    const sheetRef = useRef<HTMLDivElement>(null);
    const backdropRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const contentScrollRef = useRef<HTMLDivElement>(null);

    // Drag tracking refs (no React state updates during drag for 120 FPS performance)
    const isPointerDownRef = useRef(false);
    const isDraggingRef = useRef(false);
    const startXRef = useRef(0);
    const startYRef = useRef(0);
    const startHeightRef = useRef(0);
    const containerHeightRef = useRef(800);
    const currentDragYRef = useRef(0);
    const isButtonTouchRef = useRef(false);
    const isClosingRef = useRef(false);
    const isHandleTouchRef = useRef(false);
    const isMaximizedRef = useRef(false);

    // Lock body scroll and pull-to-refresh when drawer is open
    useEffect(() => {
        if (isOpen && product) {
            const originalOverflow = document.body.style.overflow;
            const originalOverscroll = document.body.style.overscrollBehavior;
            document.body.style.overflow = 'hidden';
            document.body.style.overscrollBehavior = 'none';

            return () => {
                document.body.style.overflow = originalOverflow;
                document.body.style.overscrollBehavior = originalOverscroll;
            };
        }
    }, [isOpen, product]);

    // Smooth close trigger
    const startCloseAnimation = useCallback(() => {
        if (isClosingRef.current) return;
        isClosingRef.current = true;

        const sheet = sheetRef.current;
        const backdrop = backdropRef.current;

        if (sheet && backdrop) {
            sheet.style.transition = 'transform 0.28s cubic-bezier(0.32, 0.72, 0, 1)';
            sheet.style.transform = 'translate3d(0, 100%, 0)';

            backdrop.style.transition = 'opacity 0.25s ease';
            backdrop.style.opacity = '0';
        }

        setTimeout(() => {
            setIsVisible(false);
            setIsMaximized(false);
            isMaximizedRef.current = false;
            isClosingRef.current = false;
            onClose();
        }, 280);
    }, [onClose]);

    // Handle open/close prop changes
    useEffect(() => {
        if (isOpen && product) {
            isClosingRef.current = false;
            setIsVisible(true);
            setIsMaximized(false);
            isMaximizedRef.current = false;

            // Measure parent container (which uses dvh)
            requestAnimationFrame(() => {
                const parent = containerRef.current?.parentElement;
                const ch = parent ? parent.clientHeight : (window.visualViewport?.height ?? window.innerHeight);
                containerHeightRef.current = ch;

                const sheet = sheetRef.current;
                const backdrop = backdropRef.current;

                if (sheet && backdrop) {
                    // Start positioned completely below the screen (zero height visible)
                    sheet.style.transition = 'none';
                    sheet.style.transform = 'translate3d(0, 100%, 0)';
                    sheet.style.height = `${Math.round(ch * 0.82)}px`;
                    sheet.style.borderTopLeftRadius = '24px';
                    sheet.style.borderTopRightRadius = '24px';
                    backdrop.style.transition = 'none';
                    backdrop.style.opacity = '0';

                    // Force browser reflow to commit initial position before animating
                    void sheet.offsetHeight;

                    // Smooth slide-up transition from bottom
                    requestAnimationFrame(() => {
                        sheet.style.transition = 'transform 0.34s cubic-bezier(0.16, 1, 0.3, 1)';
                        sheet.style.transform = 'translate3d(0, 0, 0)';

                        backdrop.style.transition = 'opacity 0.28s ease';
                        backdrop.style.opacity = '1';
                    });
                }
            });
        } else if (!isOpen && isVisible) {
            startCloseAnimation();
        }
    }, [isOpen, product, isVisible, startCloseAnimation]);

    // Track dynamic viewport changes on mobile (e.g. keyboard, browser bar hide/show)
    useEffect(() => {
        if (!isVisible) return;
        const updateHeight = () => {
            const parent = containerRef.current?.parentElement;
            const ch = parent ? parent.clientHeight : (window.visualViewport?.height ?? window.innerHeight);
            containerHeightRef.current = ch;
        };

        window.addEventListener('resize', updateHeight);
        window.visualViewport?.addEventListener('resize', updateHeight);
        return () => {
            window.removeEventListener('resize', updateHeight);
            window.visualViewport?.removeEventListener('resize', updateHeight);
        };
    }, [isVisible]);

    // Pointer events for entire Drawer area (Unified mouse + touch with pointer capture)
    const handlePointerDown = (e: React.PointerEvent) => {
        const sheet = sheetRef.current;
        if (!sheet || isClosingRef.current) return;
        if (e.button !== 0) return; // Only main button / touch

        isPointerDownRef.current = true;
        isDraggingRef.current = false;
        startYRef.current = e.clientY;
        startXRef.current = e.clientX;
        startHeightRef.current = sheet.offsetHeight;
        currentDragYRef.current = 0;

        const target = e.target as HTMLElement;
        const isButton = !!target.closest('button, a, input');
        isButtonTouchRef.current = isButton;
        isHandleTouchRef.current = !!target.closest('[data-drag-handle]');

        // Immediately capture pointer unless directly touching an interactive button!
        // This guarantees mobile browser never attempts pull-to-refresh or cancels the gesture!
        if (!isButton) {
            isDraggingRef.current = true;
            sheet.style.transition = 'none';
            try {
                sheet.setPointerCapture(e.pointerId);
            } catch {
                // ignore
            }
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isPointerDownRef.current || isClosingRef.current) return;

        const sheet = sheetRef.current;
        if (!sheet) return;

        const deltaY = e.clientY - startYRef.current;
        const deltaX = e.clientX - startXRef.current;

        // If touched a button, check if vertical drag threshold is crossed to switch to drag
        if (!isDraggingRef.current) {
            if (Math.abs(deltaY) > 5 && Math.abs(deltaY) > Math.abs(deltaX)) {
                isDraggingRef.current = true;
                sheet.style.transition = 'none';
                try {
                    sheet.setPointerCapture(e.pointerId);
                } catch {
                    // ignore
                }
            } else {
                return;
            }
        }

        currentDragYRef.current = deltaY;

        const ch = containerHeightRef.current;
        const isMax = isMaximizedRef.current;
        const initialH = isMax ? ch : Math.round(ch * 0.82);

        // Dragging DOWN (deltaY > 0): move drawer down via GPU transform
        if (deltaY > 0) {
            sheet.style.transform = `translate3d(0, ${deltaY}px, 0)`;
            sheet.style.height = `${initialH}px`;
            sheet.style.borderTopLeftRadius = '24px';
            sheet.style.borderTopRightRadius = '24px';
        }
        // Dragging UP (deltaY < 0): expand drawer height towards 100%
        else {
            const newHeight = Math.min(ch, startHeightRef.current - deltaY);
            sheet.style.transform = 'translate3d(0, 0, 0)';
            sheet.style.height = `${newHeight}px`;

            if (newHeight >= ch - 6) {
                sheet.style.borderTopLeftRadius = '0px';
                sheet.style.borderTopRightRadius = '0px';
            } else {
                sheet.style.borderTopLeftRadius = '24px';
                sheet.style.borderTopRightRadius = '24px';
            }
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!isPointerDownRef.current) return;
        isPointerDownRef.current = false;

        const wasDragging = isDraggingRef.current;
        isDraggingRef.current = false;

        const sheet = sheetRef.current;
        if (!sheet || isClosingRef.current) return;

        if (wasDragging) {
            try {
                sheet.releasePointerCapture(e.pointerId);
            } catch {
                // Ignore if pointer capture already released
            }

            const deltaY = currentDragYRef.current;
            const ch = containerHeightRef.current;
            const currentH = sheet.offsetHeight;

            // Re-enable smooth transition curves
            sheet.style.transition =
                'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), height 0.3s cubic-bezier(0.16, 1, 0.3, 1), border-radius 0.2s ease';

            // 1. Dragged DOWN significantly (> 80px) -> Close drawer!
            if (deltaY > 80) {
                startCloseAnimation();
            }
            // 2. Dragged UP significantly (< -50px) or height near full -> Maximize to full height (100%)!
            else if (deltaY < -50 || currentH > ch * 0.88) {
                sheet.style.transform = 'translate3d(0, 0, 0)';
                sheet.style.height = `${ch}px`;
                sheet.style.borderTopLeftRadius = '0px';
                sheet.style.borderTopRightRadius = '0px';
                setIsMaximized(true);
                isMaximizedRef.current = true;
            }
            // 3. Otherwise snap back to natural 82% height (or back to 100% if already maximized and pulled slightly)
            else {
                if (isMaximizedRef.current && deltaY <= 80) {
                    sheet.style.transform = 'translate3d(0, 0, 0)';
                    sheet.style.height = `${ch}px`;
                    sheet.style.borderTopLeftRadius = '0px';
                    sheet.style.borderTopRightRadius = '0px';
                    setIsMaximized(true);
                    isMaximizedRef.current = true;
                } else {
                    const naturalH = Math.round(ch * 0.82);
                    sheet.style.transform = 'translate3d(0, 0, 0)';
                    sheet.style.height = `${naturalH}px`;
                    sheet.style.borderTopLeftRadius = '24px';
                    sheet.style.borderTopRightRadius = '24px';
                    setIsMaximized(false);
                    isMaximizedRef.current = false;
                }
            }
        }
    };

    if (!isVisible || !product) return null;

    return (
        <div
            ref={containerRef}
            className="absolute inset-0 z-50 overflow-hidden pointer-events-none select-none overscroll-none"
            style={{ overscrollBehavior: 'none', touchAction: 'none' }}
        >
            {/* Backdrop Overlay */}
            <div
                ref={backdropRef}
                onClick={startCloseAnimation}
                className="absolute inset-0 bg-black/60 backdrop-blur-xs cursor-pointer pointer-events-auto opacity-0"
                style={{ overscrollBehavior: 'none', touchAction: 'none' }}
            />

            {/* Bottom Sheet Drawer - Entire area supports dragging with zero pull-to-refresh */}
            <div
                ref={sheetRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="absolute bottom-0 left-0 right-0 bg-white shadow-2xl flex flex-col z-10 border-t border-[#E7E3DA] pointer-events-auto rounded-t-[24px] overflow-hidden will-change-transform select-none"
                style={{
                    transform: 'translate3d(0, 100%, 0)',
                    touchAction: 'none',
                    overscrollBehavior: 'none',
                }}
            >
                {/* Drag Handle & Header */}
                <div
                    data-drag-handle="true"
                    className="w-full flex items-center justify-center pt-3.5 pb-2.5 cursor-ns-resize select-none relative hover:bg-zinc-50/70 transition-colors"
                    style={{ touchAction: 'none' }}
                >
                    {/* Visual drag handle pill */}
                    <div className="w-10 h-1.5 bg-[#1C1B19]/25 hover:bg-[#1C1B19]/45 rounded-full transition-colors pointer-events-none" />
                </div>

                {/* Scrollable Content Body */}
                <div
                    ref={contentScrollRef}
                    className="flex-1 overflow-y-auto px-4.5 pt-2 pb-8 space-y-4 select-none"
                    style={{
                        scrollbarWidth: 'none',
                        WebkitOverflowScrolling: 'touch',
                        touchAction: 'none',
                        overscrollBehavior: 'none',
                    }}
                >
                    {/* Product Image */}
                    {product.imageUrl && (
                        <div
                            className="w-full aspect-video rounded-xl overflow-hidden bg-zinc-100 border border-[#E7E3DA] flex-shrink-0 select-none"
                            style={{ touchAction: 'none' }}
                        >
                            <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-full h-full object-cover pointer-events-none select-none"
                                draggable={false}
                            />
                        </div>
                    )}

                    {/* Product Title & Price */}
                    <div>
                        <h3 className="text-xl font-bold text-[#1C1B19] tracking-tight">
                            {product.name}
                        </h3>
                        <div className="mt-1 text-lg font-bold text-[#1C1B19]">
                            {product.variations && product.variations.length > 0 ? (
                                formatPrice(
                                    product.variations[selectedVariationIndex]?.price || product.price
                                )
                            ) : (
                                formatPrice(product.price)
                            )}
                        </div>
                    </div>

                    {/* Variations Selector if any */}
                    {product.variations && product.variations.length > 0 && (
                        <div className="space-y-2 pt-1">
                            <span className="text-xs font-semibold text-[#1C1B19] uppercase tracking-wider">
                                Seçenekler
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                                {product.variations.map((v, i) => {
                                    const isSel = selectedVariationIndex === i;
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => setSelectedVariationIndex(i)}
                                            className={`p-2.5 rounded-xl border text-left cursor-pointer transition-colors ${
                                                isSel
                                                    ? 'border-[#1C1D19] bg-[#1C1D19] text-white'
                                                    : 'border-[#E7E3DA] bg-[#F9F9F7] text-[#1C1B19] hover:border-zinc-400'
                                            }`}
                                        >
                                            <div className="text-xs font-semibold">{v.unit}</div>
                                            <div
                                                className={`text-xs mt-0.5 ${
                                                    isSel ? 'text-zinc-300' : 'text-[#6B6862]'
                                                }`}
                                            >
                                                {formatPrice(v.price)}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Description */}
                    {product.description && (
                        <div className="pt-1">
                            <p className="text-sm text-[#6B6862] leading-relaxed">
                                {product.description}
                            </p>
                        </div>
                    )}

                    {/* Dietary Tags */}
                    {product.tags && product.tags.length > 0 && (
                        <div className="pt-2">
                            <div className="flex flex-wrap gap-1.5">
                                {product.tags.map(renderTag)}
                            </div>
                        </div>
                    )}

                    {/* Additional Details: Calories, Prep Time */}
                    {(product.calories || product.cookingTime) && (
                        <div className="pt-2 flex items-center gap-4 text-xs text-[#6B6862]">
                            {product.calories ? (
                                <span className="inline-flex items-center gap-1">
                                    <Flame className="w-3.5 h-3.5 text-amber-600" />
                                    {product.calories} kcal
                                </span>
                            ) : null}
                            {product.cookingTime ? (
                                <span className="inline-flex items-center gap-1">
                                    <Timer className="w-3.5 h-3.5 text-blue-600" />
                                    {product.cookingTime} dk
                                </span>
                            ) : null}
                        </div>
                    )}

                    {/* Allergens */}
                    {product.allergens && product.allergens.length > 0 && (
                        <div className="pt-2 border-t border-[#E7E3DA]">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 mb-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>Alerjen Uyarısı</span>
                            </div>
                            <p className="text-xs text-[#6B6862]">
                                İçerir: {product.allergens.join(', ')}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

