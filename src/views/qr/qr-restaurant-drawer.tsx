'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Restaurant } from '@/types';
import { MapPin, Phone, Mail, ChevronRight, ExternalLink } from 'lucide-react';
import {
    FaInstagram,
    FaFacebook,
    FaXTwitter,
    FaTiktok,
    FaWhatsapp,
    FaTelegram,
    FaYoutube,
    FaGlobe,
} from 'react-icons/fa6';

interface QrRestaurantDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    restaurant: Restaurant | null;
}

// Social platform brand info
function getSocialPlatformInfo(platform: string) {
    switch (platform.toLowerCase()) {
        case 'instagram':
            return {
                label: 'Instagram',
                icon: <FaInstagram className="w-5 h-5 text-[#E4405F]" />,
            };
        case 'whatsapp':
            return {
                label: 'WhatsApp',
                icon: <FaWhatsapp className="w-5 h-5 text-[#25D366]" />,
            };
        case 'facebook':
            return {
                label: 'Facebook',
                icon: <FaFacebook className="w-5 h-5 text-[#1877F2]" />,
            };
        case 'twitter':
        case 'x':
            return {
                label: 'X (Twitter)',
                icon: <FaXTwitter className="w-4.5 h-4.5 text-[#1C1B19]" />,
            };
        case 'tiktok':
            return {
                label: 'TikTok',
                icon: <FaTiktok className="w-4.5 h-4.5 text-[#1C1B19]" />,
            };
        case 'youtube':
            return {
                label: 'YouTube',
                icon: <FaYoutube className="w-5 h-5 text-[#FF0000]" />,
            };
        case 'telegram':
            return {
                label: 'Telegram',
                icon: <FaTelegram className="w-5 h-5 text-[#229ED9]" />,
            };
        case 'website':
            return {
                label: 'Web Sitesi',
                icon: <FaGlobe className="w-5 h-5 text-[#1C1B19]" />,
            };
        default:
            return {
                label: platform.charAt(0).toUpperCase() + platform.slice(1),
                icon: <FaGlobe className="w-5 h-5 text-[#1C1B19]" />,
            };
    }
}

// Clean url for display
function formatDisplayUrl(url: string): string {
    return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}

export function QrRestaurantDrawer({
    isOpen,
    onClose,
    restaurant,
}: QrRestaurantDrawerProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);

    const sheetRef = useRef<HTMLDivElement>(null);
    const backdropRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const contentScrollRef = useRef<HTMLDivElement>(null);

    // Gesture tracking refs (no re-renders during drag for fluid 120 FPS performance)
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
        if (isOpen && restaurant) {
            const originalOverflow = document.body.style.overflow;
            const originalOverscroll = document.body.style.overscrollBehavior;
            document.body.style.overflow = 'hidden';
            document.body.style.overscrollBehavior = 'none';

            return () => {
                document.body.style.overflow = originalOverflow;
                document.body.style.overscrollBehavior = originalOverscroll;
            };
        }
    }, [isOpen, restaurant]);

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

    // Slide up from bottom when opened
    useEffect(() => {
        if (isOpen && restaurant) {
            isClosingRef.current = false;
            setIsVisible(true);
            setIsMaximized(false);
            isMaximizedRef.current = false;

            // Measure parent container
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

                    // Force browser reflow to commit initial transform
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
    }, [isOpen, restaurant, isVisible, startCloseAnimation]);

    // Track dynamic viewport changes on mobile
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

    // Pointer events for entire Drawer area
    const handlePointerDown = (e: React.PointerEvent) => {
        const sheet = sheetRef.current;
        if (!sheet || isClosingRef.current) return;
        if (e.button !== 0) return; // Only main button/touch

        isPointerDownRef.current = true;
        isDraggingRef.current = false;
        startYRef.current = e.clientY;
        startXRef.current = e.clientX;
        startHeightRef.current = sheet.offsetHeight;
        currentDragYRef.current = 0;

        const target = e.target as HTMLElement;
        const isInteractive = !!target.closest('a, button, input');
        isButtonTouchRef.current = isInteractive;
        isHandleTouchRef.current = !!target.closest('[data-drag-handle]');

        // Immediately capture pointer if dragging from handle
        if (isHandleTouchRef.current) {
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

        const scrollEl = contentScrollRef.current;
        const scrollTop = scrollEl ? scrollEl.scrollTop : 0;

        // If not dragging yet, check conditions
        if (!isDraggingRef.current) {
            // Drag handle: immediately start on any vertical movement
            if (isHandleTouchRef.current) {
                if (Math.abs(deltaY) > 4) {
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
            // Content area:
            else {
                // If user is scrolling inside content and not at the top (scrollTop > 0)
                if (scrollTop > 2 && deltaY > 0) {
                    // Let content scroll naturally downwards
                    return;
                }

                // If drawer is already maximized and pulling downwards while content is scrolled
                if (isMaximizedRef.current && scrollTop > 2) {
                    return;
                }

                // If pulling DOWN at the top of the content (scrollTop <= 0)
                if (deltaY > 8 && Math.abs(deltaY) > Math.abs(deltaX) && scrollTop <= 0) {
                    isDraggingRef.current = true;
                    sheet.style.transition = 'none';
                    try {
                        sheet.setPointerCapture(e.pointerId);
                    } catch {
                        // ignore
                    }
                }
                // If pulling UP when NOT maximized: expand towards full screen!
                else if (deltaY < -8 && Math.abs(deltaY) > Math.abs(deltaX) && !isMaximizedRef.current) {
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
        // Dragging UP (deltaY < 0): expand drawer height towards 100% full screen
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
                // ignore
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
            // 3. Otherwise snap back to natural 82% height (or 100% if already maximized)
            else {
                if (isMaximizedRef.current && deltaY <= 80) {
                    sheet.style.transform = 'translate3d(0, 0, 0)';
                    sheet.style.height = `${ch}px`;
                    sheet.style.borderTopLeftRadius = '0px';
                    sheet.style.borderTopRightRadius = '0px';
                    setIsMaximized(true);
                    isMaximizedRef.current = true;
                } else {
                    sheet.style.transform = 'translate3d(0, 0, 0)';
                    sheet.style.height = `${Math.round(ch * 0.82)}px`;
                    sheet.style.borderTopLeftRadius = '24px';
                    sheet.style.borderTopRightRadius = '24px';
                    setIsMaximized(false);
                    isMaximizedRef.current = false;
                }
            }
        }
    };

    if (!isVisible || !restaurant) return null;

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

            {/* Bottom Sheet Drawer - Entire area supports dragging with gesture animations */}
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
                {/* Drag Handle Header */}
                <div
                    data-drag-handle="true"
                    className="w-full flex items-center justify-center pt-3.5 pb-2.5 cursor-ns-resize select-none relative hover:bg-zinc-50/70 transition-colors shrink-0"
                    style={{ touchAction: 'none' }}
                >
                    <div className="w-10 h-1.5 bg-[#1C1B19]/25 hover:bg-[#1C1B19]/45 rounded-full transition-colors pointer-events-none" />
                </div>

                {/* Scrollable Content Body */}
                <div
                    ref={contentScrollRef}
                    className="flex-1 overflow-y-auto px-5 pt-1 pb-8 space-y-5"
                    style={{
                        scrollbarWidth: 'none',
                        WebkitOverflowScrolling: 'touch',
                        overscrollBehavior: 'contain',
                    }}
                >
                    {/* Restaurant Header */}
                    <div className="pb-3 border-b border-[#E7E3DA]">
                        <h2 className="text-xl sm:text-2xl font-bold text-[#1C1B19] tracking-tight">
                            {restaurant.name}
                        </h2>
                        {restaurant.description && (
                            <p className="text-sm text-[#6B6862] leading-relaxed mt-1.5">
                                {restaurant.description}
                            </p>
                        )}
                    </div>

                    {/* Row by row contact and social media information */}
                    <div className="space-y-2.5">
                        {/* Address Row */}
                        {restaurant.address && (
                            <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                    restaurant.address
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3.5 p-3 rounded-2xl bg-[#F9F9F7] border border-[#E7E3DA] hover:border-zinc-400 active:scale-[0.99] transition-all group"
                            >
                                <div className="w-10 h-10 rounded-xl bg-white border border-[#E7E3DA] flex items-center justify-center text-[#1C1B19] shrink-0 shadow-2xs group-hover:bg-[#1C1B19] group-hover:text-white transition-colors">
                                    <MapPin className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-[11px] font-semibold text-[#6B6862] uppercase tracking-wider block">
                                        Adres
                                    </span>
                                    <span className="text-sm font-medium text-[#1C1B19] leading-snug line-clamp-2 mt-0.5">
                                        {restaurant.address}
                                    </span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-[#6B6862] shrink-0 group-hover:translate-x-0.5 transition-transform" />
                            </a>
                        )}

                        {/* Phone Row */}
                        {restaurant.phone && (
                            <a
                                href={`tel:${restaurant.phone}`}
                                className="flex items-center gap-3.5 p-3 rounded-2xl bg-[#F9F9F7] border border-[#E7E3DA] hover:border-zinc-400 active:scale-[0.99] transition-all group"
                            >
                                <div className="w-10 h-10 rounded-xl bg-white border border-[#E7E3DA] flex items-center justify-center text-[#1C1B19] shrink-0 shadow-2xs group-hover:bg-[#1C1B19] group-hover:text-white transition-colors">
                                    <Phone className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-[11px] font-semibold text-[#6B6862] uppercase tracking-wider block">
                                        Telefon
                                    </span>
                                    <span className="text-sm font-bold text-[#1C1B19] mt-0.5 block">
                                        {restaurant.phone}
                                    </span>
                                </div>
                                <span className="text-xs font-semibold text-[#1C1B19] bg-white px-2.5 py-1 rounded-lg border border-[#E7E3DA] shrink-0 group-hover:bg-[#1C1B19] group-hover:text-white transition-colors">
                                    Ara
                                </span>
                            </a>
                        )}

                        {/* Email Row (if exists) */}
                        {restaurant.email && (
                            <a
                                href={`mailto:${restaurant.email}`}
                                className="flex items-center gap-3.5 p-3 rounded-2xl bg-[#F9F9F7] border border-[#E7E3DA] hover:border-zinc-400 active:scale-[0.99] transition-all group"
                            >
                                <div className="w-10 h-10 rounded-xl bg-white border border-[#E7E3DA] flex items-center justify-center text-[#1C1B19] shrink-0 shadow-2xs group-hover:bg-[#1C1B19] group-hover:text-white transition-colors">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-[11px] font-semibold text-[#6B6862] uppercase tracking-wider block">
                                        E-posta
                                    </span>
                                    <span className="text-sm font-medium text-[#1C1B19] truncate mt-0.5 block">
                                        {restaurant.email}
                                    </span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-[#6B6862] shrink-0 group-hover:translate-x-0.5 transition-transform" />
                            </a>
                        )}

                        {/* Social Media Rows - Line by line with individual icons */}
                        {restaurant.socialMedia && restaurant.socialMedia.length > 0 && (
                            <>
                                <div className="pt-2 pb-1">
                                    <span className="text-[11px] font-semibold text-[#6B6862] uppercase tracking-wider">
                                        Sosyal Medya
                                    </span>
                                </div>
                                {restaurant.socialMedia.map((sm, i) => {
                                    const info = getSocialPlatformInfo(sm.platform);
                                    return (
                                        <a
                                            key={i}
                                            href={sm.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3.5 p-3 rounded-2xl bg-[#F9F9F7] border border-[#E7E3DA] hover:border-zinc-400 active:scale-[0.99] transition-all group"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-white border border-[#E7E3DA] flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-[#1C1B19]/5 transition-colors">
                                                {info.icon}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className="text-sm font-semibold text-[#1C1B19] block leading-tight">
                                                    {info.label}
                                                </span>
                                                <span className="text-xs text-[#6B6862] truncate block mt-0.5">
                                                    {formatDisplayUrl(sm.url)}
                                                </span>
                                            </div>
                                            <ExternalLink className="w-4 h-4 text-[#6B6862] shrink-0 group-hover:text-[#1C1B19] transition-colors" />
                                        </a>
                                    );
                                })}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
