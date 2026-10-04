'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import FormItem from '@/components/ui/Form/FormItem';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import {
    TbBuildingStore,
    TbPalette,
    TbShare,
    TbChevronDown,
    TbCheck,
} from 'react-icons/tb';
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
import { apiGet, apiPatch } from '@/lib/api';
import type { Restaurant, SocialMedia, SocialPlatform, MenuWithDetails, Menu } from '@/types';
import { QrMenuView } from '@/views/qr/qr-menu-view';

// Fallback demo menu for preview
const DEMO_PREVIEW_MENU: MenuWithDetails = {
    id: 'demo-menu',
    name: 'Ana Menü',
    orderValue: 0,
    isActive: true,
    restaurantId: 'demo-restaurant',
    createdAt: new Date(),
    updatedAt: new Date(),
    categories: [
        {
            id: 'demo-cat-1',
            name: 'Öne Çıkanlar & Başlangıçlar',
            description: 'Şefimizin özel tarifleri ve taze lezzetler',
            position: '0',
            imageUrl: null,
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
            imageUrl: null,
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
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            ],
        },
    ],
};

// Social platform configs
const SOCIAL_PLATFORMS: {
    key: SocialPlatform;
    label: string;
    placeholder: string;
    icon: React.ReactNode;
}[] = [
    {
        key: 'instagram',
        label: 'Instagram',
        placeholder: 'kullaniciadi veya profil linki',
        icon: <FaInstagram className="text-base text-[#E4405F]" />,
    },
    {
        key: 'whatsapp',
        label: 'WhatsApp',
        placeholder: '905xxxxxxxxx veya wa.me linki',
        icon: <FaWhatsapp className="text-base text-[#25D366]" />,
    },
    {
        key: 'facebook',
        label: 'Facebook',
        placeholder: 'https://facebook.com/hesap',
        icon: <FaFacebook className="text-base text-[#1877F2]" />,
    },
    {
        key: 'twitter',
        label: 'X (Twitter)',
        placeholder: 'kullaniciadi veya link',
        icon: <FaXTwitter className="text-sm text-gray-800 dark:text-gray-200" />,
    },
    {
        key: 'tiktok',
        label: 'TikTok',
        placeholder: '@kullaniciadi veya link',
        icon: <FaTiktok className="text-sm text-gray-800 dark:text-gray-200" />,
    },
    {
        key: 'youtube',
        label: 'YouTube',
        placeholder: 'https://youtube.com/@kanal',
        icon: <FaYoutube className="text-base text-[#FF0000]" />,
    },
    {
        key: 'telegram',
        label: 'Telegram',
        placeholder: 't.me/kanal veya kullaniciadi',
        icon: <FaTelegram className="text-base text-[#229ED9]" />,
    },
    {
        key: 'website',
        label: 'Web Sitesi',
        placeholder: 'https://restoraniniz.com',
        icon: <FaGlobe className="text-base text-gray-600 dark:text-gray-400" />,
    },
];

type PanelKey = 'general' | 'appearance' | 'social';

export function SettingsView() {
    const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
    const [previewMenu, setPreviewMenu] = useState<MenuWithDetails>(DEMO_PREVIEW_MENU);
    const [isLoading, setIsLoading] = useState(true);

    // Only 1 panel can be expanded at any time
    const [expandedPanel, setExpandedPanel] = useState<PanelKey | null>('general');

    // General Form State
    const [generalData, setGeneralData] = useState({
        name: '',
        description: '',
        address: '',
        phone: '',
        email: '',
    });
    const [initialGeneralData, setInitialGeneralData] = useState({ ...generalData });

    // Appearance State
    const [imagePosition, setImagePosition] = useState<'right' | 'left' | 'top'>('right');
    const [initialImagePosition, setInitialImagePosition] = useState<'right' | 'left' | 'top'>('right');

    // Social Media State
    const [socialData, setSocialData] = useState<Record<string, string>>({
        instagram: '',
        whatsapp: '',
        facebook: '',
        twitter: '',
        tiktok: '',
        youtube: '',
        telegram: '',
        website: '',
    });
    const [initialSocialData, setInitialSocialData] = useState({ ...socialData });

    // Independent Loading States
    const [isSavingGeneral, setIsSavingGeneral] = useState(false);
    const [isSavingAppearance, setIsSavingAppearance] = useState(false);
    const [isSavingSocial, setIsSavingSocial] = useState(false);

    // Accordion toggle: only 1 panel expanded at a time
    const handleTogglePanel = (panel: PanelKey) => {
        setExpandedPanel((prev) => (prev === panel ? null : panel));
    };

    // Set page background color to #f4f5f6
    useEffect(() => {
        const mainEl = document.querySelector('main');
        const pageContainer = document.querySelector('.page-container');
        if (mainEl) {
            mainEl.style.backgroundColor = '#f4f5f6';
        }
        if (pageContainer) {
            (pageContainer as HTMLElement).style.backgroundColor = '#f4f5f6';
        }
        return () => {
            if (mainEl) mainEl.style.backgroundColor = '';
            if (pageContainer) (pageContainer as HTMLElement).style.backgroundColor = '';
        };
    }, []);

    // Load initial data
    useEffect(() => {
        async function loadInitialData() {
            setIsLoading(true);
            try {
                // 1. Fetch restaurant
                const resResponse = await apiGet<Restaurant>('/api/restaurant');
                if (resResponse.data) {
                    const r = resResponse.data;
                    setRestaurant(r);
                    const gen = {
                        name: r.name || '',
                        description: r.description || '',
                        address: r.address || '',
                        phone: r.phone || '',
                        email: r.email || '',
                    };
                    setGeneralData(gen);
                    setInitialGeneralData(gen);

                    const pos = r.appearance?.imagePosition || 'right';
                    setImagePosition(pos);
                    setInitialImagePosition(pos);

                    const sMap: Record<string, string> = {
                        instagram: '',
                        whatsapp: '',
                        facebook: '',
                        twitter: '',
                        tiktok: '',
                        youtube: '',
                        telegram: '',
                        website: '',
                    };
                    if (r.socialMedia && Array.isArray(r.socialMedia)) {
                        r.socialMedia.forEach((sm) => {
                            if (sm.platform) {
                                sMap[sm.platform] = sm.url || '';
                            }
                        });
                    }
                    setSocialData(sMap);
                    setInitialSocialData(sMap);
                }

                // 2. Fetch menus for live preview
                try {
                    const menusResponse = await apiGet<Menu[]>('/api/menus');
                    const menus = menusResponse.data || [];
                    if (menus.length > 0) {
                        const activeMenu = menus.find((m) => m.isActive) || menus[0];
                        const menuDetailResponse = await apiGet<MenuWithDetails>(`/api/menus/${activeMenu.id}`);
                        if (menuDetailResponse.data && menuDetailResponse.data.categories?.length > 0) {
                            setPreviewMenu(menuDetailResponse.data);
                        }
                    }
                } catch (menuErr) {
                    console.log('Using default demo menu for preview:', menuErr);
                }
            } catch (err) {
                console.error('Failed to load settings data:', err);
                toast.error('Ayarlar yüklenirken bir sorun oluştu');
            } finally {
                setIsLoading(false);
            }
        }

        loadInitialData();
    }, []);

    // Format Social Media list for API and Live Preview
    const formatSocialMediaList = (sourceData: Record<string, string>): SocialMedia[] => {
        return Object.entries(sourceData)
            .filter(([_, url]) => url && url.trim().length > 0)
            .map(([platform, rawUrl]) => {
                let cleanUrl = rawUrl.trim();
                if (platform === 'whatsapp' && !cleanUrl.startsWith('http')) {
                    const digitsOnly = cleanUrl.replace(/\D/g, '');
                    cleanUrl = `https://wa.me/${digitsOnly}`;
                } else if (!cleanUrl.startsWith('http') && platform !== 'website') {
                    if (platform === 'instagram') cleanUrl = `https://instagram.com/${cleanUrl.replace(/^@/, '')}`;
                    else if (platform === 'twitter') cleanUrl = `https://x.com/${cleanUrl.replace(/^@/, '')}`;
                    else if (platform === 'tiktok') cleanUrl = `https://tiktok.com/@${cleanUrl.replace(/^@/, '')}`;
                    else if (platform === 'youtube') cleanUrl = `https://youtube.com/${cleanUrl}`;
                    else if (platform === 'telegram') cleanUrl = `https://t.me/${cleanUrl.replace(/^@/, '')}`;
                    else if (platform === 'facebook') cleanUrl = `https://facebook.com/${cleanUrl}`;
                } else if (!cleanUrl.startsWith('http') && platform === 'website') {
                    cleanUrl = `https://${cleanUrl}`;
                }

                return {
                    platform: platform as SocialPlatform,
                    url: cleanUrl,
                };
            });
    };

    // Live preview restaurant object synced with current form inputs
    const liveRestaurant = useMemo<Restaurant>(() => {
        return {
            ...restaurant,
            id: restaurant?.id || 'preview-restaurant-id',
            name: generalData.name || restaurant?.name || 'Restoran Adı',
            description: generalData.description,
            address: generalData.address,
            phone: generalData.phone,
            email: generalData.email,
            appearance: {
                imagePosition: imagePosition,
            },
            socialMedia: formatSocialMediaList(socialData),
            currency: restaurant?.currency || 'TRY',
            logoUrl: restaurant?.logoUrl || null,
            createdAt: restaurant?.createdAt || new Date(),
            updatedAt: new Date(),
        };
    }, [restaurant, generalData, imagePosition, socialData]);

    // Save Handlers
    const handleSaveGeneral = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!generalData.name.trim()) {
            toast.error('Lütfen restoran adını giriniz');
            return;
        }

        setIsSavingGeneral(true);
        try {
            const payload = {
                name: generalData.name.trim(),
                description: generalData.description.trim(),
                address: generalData.address.trim(),
                phone: generalData.phone.trim(),
                email: generalData.email.trim(),
            };
            const res = await apiPatch<Restaurant>('/api/restaurant', payload);
            if (res.data) {
                setRestaurant((prev) => ({ ...prev, ...res.data } as Restaurant));
                setInitialGeneralData({ ...generalData });
            }
            toast.success('General settings saved successfully');
        } catch (error) {
            console.error('Failed to save general settings:', error);
            toast.error('Genel bilgiler kaydedilirken hata oluştu');
        } finally {
            setIsSavingGeneral(false);
        }
    };

    const handleSaveAppearance = async () => {
        setIsSavingAppearance(true);
        try {
            const payload = {
                appearance: {
                    imagePosition: imagePosition,
                },
            };
            const res = await apiPatch<Restaurant>('/api/restaurant', payload);
            if (res.data) {
                setRestaurant((prev) => ({ ...prev, ...res.data } as Restaurant));
                setInitialImagePosition(imagePosition);
            }
            toast.success('Appearance settings saved successfully');
        } catch (error) {
            console.error('Failed to save appearance settings:', error);
            toast.error('Görünüm ayarları kaydedilirken hata oluştu');
        } finally {
            setIsSavingAppearance(false);
        }
    };

    const handleSaveSocial = async () => {
        setIsSavingSocial(true);
        try {
            const activeList = formatSocialMediaList(socialData);
            const payload = {
                socialMedia: activeList,
            };
            const res = await apiPatch<Restaurant>('/api/restaurant', payload);
            if (res.data) {
                setRestaurant((prev) => ({ ...prev, ...res.data } as Restaurant));
                setInitialSocialData({ ...socialData });
            }
            toast.success('Social media settings saved successfully');
        } catch (error) {
            console.error('Failed to save social media settings:', error);
            toast.error('Sosyal medya hesapları kaydedilirken hata oluştu');
        } finally {
            setIsSavingSocial(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[420px] gap-3">
                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-medium text-gray-500">Loading settings...</p>
            </div>
        );
    }

    return (
        <div className="w-full space-y-6 bg-[#f4f5f6]">
            {/* Header Section */}
            <div>
                <h3 className="text-2xl font-bold tracking-tight heading-text mb-1">
                    Settings
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Customize your restaurant information, menu appearance, and social channels.
                </p>
            </div>

            {/* Two-Column Responsive Layout: Left Collapsible Accordion Panels, Right Clean Phone Mockup */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                
                {/* Left Column: Collapsible Panels (Only 1 open at a time) */}
                <div className="xl:col-span-7 2xl:col-span-8 space-y-4">
                    
                    {/* PANEL 1: GENERAL */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700/80 shadow-xs overflow-hidden transition-all duration-200">
                        {/* Header Button */}
                        <button
                            type="button"
                            onClick={() => handleTogglePanel('general')}
                            className="w-full px-6 py-4.5 flex items-center justify-between gap-4 text-left hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors cursor-pointer select-none"
                        >
                            <div className="flex items-center gap-3.5">
                                <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-gray-700/60 text-gray-700 dark:text-gray-200 border border-gray-200/80 dark:border-gray-700 flex items-center justify-center shrink-0">
                                    <TbBuildingStore className="text-2xl" />
                                </div>
                                <div>
                                    <h4 className="text-base font-bold heading-text">
                                        General Information
                                    </h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        Restoran adı, açıklama, açık adres ve iletişim detayları
                                    </p>
                                </div>
                            </div>
                            <div
                                className={`p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-transform duration-200 ${
                                    expandedPanel === 'general' ? 'rotate-180' : ''
                                }`}
                            >
                                <TbChevronDown className="text-xl" />
                            </div>
                        </button>

                        {/* Collapsible Content */}
                        {expandedPanel === 'general' && (
                            <div className="px-6 pb-6 pt-2 border-t border-gray-100 dark:border-gray-700/60">
                                <form onSubmit={handleSaveGeneral} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Restaurant Name */}
                                        <FormItem
                                            label="Restoran Adı"
                                            asterisk
                                            className="md:col-span-2"
                                        >
                                            <Input
                                                value={generalData.name}
                                                onChange={(e) =>
                                                    setGeneralData((p) => ({ ...p, name: e.target.value }))
                                                }
                                                placeholder="Örn: Kemal Et & Mangal"
                                                required
                                            />
                                        </FormItem>

                                        {/* Phone */}
                                        <FormItem label="Telefon Numarası">
                                            <Input
                                                value={generalData.phone}
                                                onChange={(e) =>
                                                    setGeneralData((p) => ({ ...p, phone: e.target.value }))
                                                }
                                                placeholder="Örn: +90 216 123 45 67"
                                            />
                                        </FormItem>

                                        {/* Email */}
                                        <FormItem label="E-posta Adresi">
                                            <Input
                                                type="email"
                                                value={generalData.email}
                                                onChange={(e) =>
                                                    setGeneralData((p) => ({ ...p, email: e.target.value }))
                                                }
                                                placeholder="info@restoraniniz.com"
                                            />
                                        </FormItem>

                                        {/* Address */}
                                        <FormItem
                                            label="Açık Adres"
                                            className="md:col-span-2"
                                        >
                                            <Input
                                                value={generalData.address}
                                                onChange={(e) =>
                                                    setGeneralData((p) => ({ ...p, address: e.target.value }))
                                                }
                                                placeholder="Örn: Bağdat Caddesi No: 124/A Kadıköy, İstanbul"
                                            />
                                        </FormItem>

                                        {/* Description */}
                                        <FormItem
                                            label="Restoran Açıklaması / Slogan"
                                            className="md:col-span-2"
                                        >
                                            <Input
                                                textArea
                                                rows={3}
                                                value={generalData.description}
                                                onChange={(e) =>
                                                    setGeneralData((p) => ({ ...p, description: e.target.value }))
                                                }
                                                placeholder="1985'ten bu yana geleneksel tariflerle pişirilen lezzetler..."
                                            />
                                        </FormItem>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-700/60">
                                        <Button
                                            type="button"
                                            disabled={isSavingGeneral}
                                            onClick={() => setGeneralData({ ...initialGeneralData })}
                                        >
                                            Discard
                                        </Button>
                                        <Button
                                            variant="solid"
                                            type="submit"
                                            loading={isSavingGeneral}
                                        >
                                            Save
                                        </Button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>

                    {/* PANEL 2: APPEARANCE (Between General & Social Media) */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700/80 shadow-xs overflow-hidden transition-all duration-200">
                        {/* Header Button */}
                        <button
                            type="button"
                            onClick={() => handleTogglePanel('appearance')}
                            className="w-full px-6 py-4.5 flex items-center justify-between gap-4 text-left hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors cursor-pointer select-none"
                        >
                            <div className="flex items-center gap-3.5">
                                <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-gray-700/60 text-gray-700 dark:text-gray-200 border border-gray-200/80 dark:border-gray-700 flex items-center justify-center shrink-0">
                                    <TbPalette className="text-2xl" />
                                </div>
                                <div>
                                    <h4 className="text-base font-bold heading-text">
                                        Appearance
                                    </h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        Menüdeki ürün fotoğraflarının yerleşimi ve sergilenme şekli
                                    </p>
                                </div>
                            </div>
                            <div
                                className={`p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-transform duration-200 ${
                                    expandedPanel === 'appearance' ? 'rotate-180' : ''
                                }`}
                            >
                                <TbChevronDown className="text-xl" />
                            </div>
                        </button>

                        {/* Collapsible Content */}
                        {expandedPanel === 'appearance' && (
                            <div className="px-6 pb-6 pt-2 border-t border-gray-100 dark:border-gray-700/60 space-y-5">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                                        Ürün Görseli Yerleşimi
                                    </label>
                                    <p className="text-xs text-gray-500 mb-4">
                                        Seçtiğiniz düzen sağdaki canlı önizlemede anında aktifleşir.
                                    </p>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                                        
                                        {/* Option: RIGHT */}
                                        <div
                                            onClick={() => setImagePosition('right')}
                                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                                                imagePosition === 'right'
                                                    ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-xs'
                                                    : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-white dark:bg-gray-900'
                                            }`}
                                        >
                                            {/* Mini Schematic View */}
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
                                            {/* Mini Schematic View */}
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
                                            {/* Mini Schematic View */}
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

                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-700/60">
                                    <Button
                                        type="button"
                                        disabled={isSavingAppearance}
                                        onClick={() => setImagePosition(initialImagePosition)}
                                    >
                                        Discard
                                    </Button>
                                    <Button
                                        variant="solid"
                                        type="button"
                                        loading={isSavingAppearance}
                                        onClick={handleSaveAppearance}
                                    >
                                        Save
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* PANEL 3: SOCIAL MEDIA */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700/80 shadow-xs overflow-hidden transition-all duration-200">
                        {/* Header Button */}
                        <button
                            type="button"
                            onClick={() => handleTogglePanel('social')}
                            className="w-full px-6 py-4.5 flex items-center justify-between gap-4 text-left hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors cursor-pointer select-none"
                        >
                            <div className="flex items-center gap-3.5">
                                <div className="w-11 h-11 rounded-xl bg-gray-100 dark:bg-gray-700/60 text-gray-700 dark:text-gray-200 border border-gray-200/80 dark:border-gray-700 flex items-center justify-center shrink-0">
                                    <TbShare className="text-2xl" />
                                </div>
                                <div>
                                    <h4 className="text-base font-bold heading-text">
                                        Social Media
                                    </h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        QR menüdeki (i) bilgi drawer'ında görünecek sosyal medya hesapları
                                    </p>
                                </div>
                            </div>
                            <div
                                className={`p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-transform duration-200 ${
                                    expandedPanel === 'social' ? 'rotate-180' : ''
                                }`}
                            >
                                <TbChevronDown className="text-xl" />
                            </div>
                        </button>

                        {/* Collapsible Content */}
                        {expandedPanel === 'social' && (
                            <div className="px-6 pb-6 pt-2 border-t border-gray-100 dark:border-gray-700/60 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {SOCIAL_PLATFORMS.map((platform) => (
                                        <FormItem
                                            key={platform.key}
                                            label={platform.label}
                                        >
                                            <Input
                                                prefix={platform.icon}
                                                value={socialData[platform.key] || ''}
                                                onChange={(e) =>
                                                    setSocialData((prev) => ({
                                                        ...prev,
                                                        [platform.key]: e.target.value,
                                                    }))
                                                }
                                                placeholder={platform.placeholder}
                                            />
                                        </FormItem>
                                    ))}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-700/60">
                                    <Button
                                        type="button"
                                        disabled={isSavingSocial}
                                        onClick={() => setSocialData({ ...initialSocialData })}
                                    >
                                        Discard
                                    </Button>
                                    <Button
                                        variant="solid"
                                        type="button"
                                        loading={isSavingSocial}
                                        onClick={handleSaveSocial}
                                    >
                                        Save
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                </div>

                {/* Right Column: Clean Phone Preview Only (No Header, No Warning Alert) */}
                <div className="xl:col-span-5 2xl:col-span-4 xl:sticky xl:top-6 flex items-center justify-center">
                    <QrMenuView
                        menu={previewMenu}
                        restaurant={liveRestaurant}
                        isLivePreview={true}
                    />
                </div>

            </div>
        </div>
    );
}
