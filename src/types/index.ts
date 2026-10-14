// Restaurant Management System - Type Definitions

/**
 * Product Tag Enum
 * Represents various dietary and feature tags for menu items
 */
export enum ProductTag {
    POPULAR = 'POPULAR',
    FEATURED = 'FEATURED',
    CHEF_SPECIAL = 'CHEF_SPECIAL',
    NEW = 'NEW',
    DISCOUNT = 'DISCOUNT',
    VEGAN = 'VEGAN',
    VEGETARIAN = 'VEGETARIAN',
    SPICY = 'SPICY',
    GLUTEN_FREE = 'GLUTEN_FREE',
    DAIRY_FREE = 'DAIRY_FREE',
    NUT_FREE = 'NUT_FREE',
}

/**
 * Tag configuration with labels and icons
 */
export const TAG_CONFIG: Record<ProductTag, { label: string; icon: string }> = {
    [ProductTag.POPULAR]: { label: 'Popüler', icon: '⭐' },
    [ProductTag.FEATURED]: { label: 'Öne Çıkan', icon: '✨' },
    [ProductTag.CHEF_SPECIAL]: { label: 'Şefin Tavsiyesi', icon: '👨‍🍳' },
    [ProductTag.NEW]: { label: 'Yeni', icon: '🆕' },
    [ProductTag.DISCOUNT]: { label: 'Fırsat', icon: '🏷️' },
    [ProductTag.VEGAN]: { label: 'Vegan', icon: '🌱' },
    [ProductTag.VEGETARIAN]: { label: 'Vejetaryen', icon: '🥬' },
    [ProductTag.SPICY]: { label: 'Acılı', icon: '🌶️' },
    [ProductTag.GLUTEN_FREE]: { label: 'Glutensiz', icon: '🌾' },
    [ProductTag.DAIRY_FREE]: { label: 'Sütsüz', icon: '🥛' },
    [ProductTag.NUT_FREE]: { label: 'Fındıksız', icon: '🥜' },
};

/**
 * Primary promotion tags
 */
export const PRIMARY_PRODUCT_TAGS: ProductTag[] = [
    ProductTag.POPULAR,
    ProductTag.FEATURED,
    ProductTag.CHEF_SPECIAL,
    ProductTag.NEW,
];

/**
 * Dietary and lifestyle tags
 */
export const DIETARY_PRODUCT_TAGS: ProductTag[] = [
    ProductTag.VEGAN,
    ProductTag.VEGETARIAN,
    ProductTag.SPICY,
    ProductTag.GLUTEN_FREE,
    ProductTag.DAIRY_FREE,
    ProductTag.NUT_FREE,
    ProductTag.DISCOUNT,
];

export interface FoodOptionItem {
    value: string;
    label: string;
    icon?: string;
    description?: string;
}

/**
 * Turkish Food Codex (TGK) 14 Mandatory Allergen List
 * Türk Gıda Kodeksi Gıda Etiketleme ve Tüketicileri Bilgilendirme Yönetmeliği Ek-1
 */
export const ALLERGEN_OPTIONS: FoodOptionItem[] = [
    { value: 'gluten', label: 'Gluten İçeren Tahıllar', icon: '🌾', description: 'Buğday, çavdar, arpa, yulaf, kavuzlu buğday vb.' },
    { value: 'crustaceans', label: 'Kabuklular', icon: '🦐', description: 'Karides, yengeç, ıstakoz vb.' },
    { value: 'eggs', label: 'Yumurta', icon: '🥚', description: 'Yumurta ve yumurta ürünleri' },
    { value: 'fish', label: 'Balık', icon: '🐟', description: 'Balık ve balık ürünleri' },
    { value: 'peanuts', label: 'Yerfıstığı', icon: '🥜', description: 'Yerfıstığı ve ürünleri' },
    { value: 'soybeans', label: 'Soya Fasulyesi', icon: '🫘', description: 'Soya fasulyesi ve ürünleri' },
    { value: 'milk', label: 'Süt ve Süt Ürünleri', icon: '🥛', description: 'Laktoz dahil süt ve mamulleri' },
    { value: 'nuts', label: 'Sert Kabuklu Meyveler', icon: '🌰', description: 'Fındık, ceviz, badem, antep fıstığı, kaju vb.' },
    { value: 'celery', label: 'Kereviz', icon: '🥬', description: 'Kereviz ve kereviz ürünleri' },
    { value: 'mustard', label: 'Hardal', icon: '🌭', description: 'Hardal ve hardal ürünleri' },
    { value: 'sesame', label: 'Susam Tohumu', icon: '🥯', description: 'Susam tohumu ve ürünleri' },
    { value: 'sulphites', label: 'Kükürt Dioksit ve Sülfitler', icon: '🍷', description: '10 mg/kg veya 10 mg/litre üzeri' },
    { value: 'lupin', label: 'Acı Bakla (Lupin)', icon: '🫛', description: 'Acı bakla ve ürünleri' },
    { value: 'molluscs', label: 'Yumuşakçalar', icon: '🐙', description: 'Midye, kalamar, ahtapot, sübye vb.' },
];

export const ALLERGEN_MAP: Record<string, FoodOptionItem> = {
    ...ALLERGEN_OPTIONS.reduce((acc, item) => ({ ...acc, [item.value]: item }), {}),
    // Backward compatibility mappings
    dairy: { value: 'dairy', label: 'Süt ve Süt Ürünleri', icon: '🥛', description: 'Laktoz dahil' },
};

export function getAllergenLabel(value: string): string {
    return ALLERGEN_MAP[value]?.label || value;
}

export function getAllergenDisplay(value: string): { label: string; icon?: string } {
    const found = ALLERGEN_MAP[value];
    if (found) {
        return { label: found.label, icon: found.icon };
    }
    return { label: value };
}

/**
 * Turkish Food Codex & International Content Warnings
 * Tüketiciyi bilgilendirme zorunlu ve küresel uyarılar
 */
export const CONTENT_WARNING_OPTIONS: FoodOptionItem[] = [
    { value: 'pork', label: 'Domuz Eti / Mamulü İçerir', icon: '🚫', description: 'Türk Gıda Kodeksi zorunlu beyan' },
    { value: 'alcohol', label: 'Alkol / Alkol Türevi İçerir', icon: '🍷', description: 'Türk Gıda Kodeksi zorunlu beyan' },
    { value: 'sweetener', label: 'Tatlandırıcı İçerir', icon: '🍬', description: 'Aşırı tüketimi laksatif etki yaratabilir' },
    { value: 'phenylalanine', label: 'Aspartam / Fenilalanin Kaynağı İçerir', icon: '⚠️', description: 'Fenilketonüri hastaları için uyarı' },
    { value: 'high_caffeine', label: 'Yüksek Kafein İçerir', icon: '☕', description: 'Çocuklar, hamileler için tavsiye edilmez' },
    { value: 'msg', label: 'Monosodyum Glutamat (MSG) İçerir', icon: '🧂', description: 'Lezzet artırıcı (E621)' },
    { value: 'gmo', label: 'GDO (Genetiği Değiştirilmiş Organizma) İçerir', icon: '🧬', description: 'GDO beyanı' },
    { value: 'preservatives', label: 'Koruyucu Madde İçerir', icon: '🧪', description: 'Kimyasal/katkı koruyucular' },
    { value: 'artificial_colors', label: 'Yapay Renklendirici İçerir', icon: '🎨', description: 'Azo boyar madde dikkat uyarısı' },
    { value: 'raw_meat_seafood', label: 'Çiğ / Az Pişmiş Et veya Deniz Ürünü İçerir', icon: '🥩', description: 'Gıda güvenliği / FDA Food Code uyarısı' },
    { value: 'unpasteurized', label: 'Pastörize Edilmemiş Ürün İçerir', icon: '🥛', description: 'Çiğ süt veya taze sütten mamul' },
    { value: 'trans_fat', label: 'Trans Yağ İçerir', icon: '🧈', description: 'Endüstriyel trans yağ' },
    { value: 'defrosted', label: 'Dondurulmuş Üründen Çözündürülmüştür', icon: '❄️', description: 'TGK tüketici bilgilendirmesi' },
    { value: 'spicy_hot', label: 'Aşırı Acı / Yoğun Baharatlı', icon: '🌶️', description: 'Mide hassasiyeti uyarısı' },
    { value: 'animal_gelatin', label: 'Hayvansal Jelatin İçerir', icon: '🥣', description: 'Sığır veya hayvansal kaynaklı jelatin' },
    { value: 'pregnancy_warning', label: 'Hamileler İçin Uygun Değildir', icon: '🤰', description: 'Sağlık uyarısı' },
    { value: 'halal', label: 'Helal Kesim / Helal Sertifikalı', icon: '☪️', description: 'İslami usullere uygun' },
    { value: 'kosher', label: 'Koşer Sertifikalı', icon: '✡️', description: 'Musevi kaidelerine uygun' },
];

export const CONTENT_WARNING_MAP: Record<string, FoodOptionItem> = CONTENT_WARNING_OPTIONS.reduce(
    (acc, item) => ({ ...acc, [item.value]: item }),
    {}
);

export function getContentWarningLabel(value: string): string {
    return CONTENT_WARNING_MAP[value]?.label || value;
}

export function getContentWarningDisplay(value: string): { label: string; icon?: string } {
    const found = CONTENT_WARNING_MAP[value];
    if (found) {
        return { label: found.label, icon: found.icon };
    }
    return { label: value };
}

/**
 * Currency options for restaurant pricing
 */
export type Currency = 'TRY' | 'USD' | 'EUR';

/**
 * Social Media Platform types
 */
export type SocialPlatform = 'instagram' | 'twitter' | 'facebook' | 'tiktok' | 'whatsapp' | 'telegram' | 'youtube' | 'website' | 'other';

export interface SocialMedia {
    platform: SocialPlatform;
    url: string;
    username?: string;
}

/**
 * Opening Hours for a specific day
 */
export interface OpeningHours {
    day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
    label: string; // Pazartesi, Salı, etc.
    isOpen: boolean;
    openTime: string; // HH:mm
    closeTime: string; // HH:mm
}

/**
 * QR Code Customization Settings
 */
export interface QrSettings {
    backgroundColor: string;
    foregroundColor: string;
    text: string;
    textPosition: 'top' | 'bottom';
}

export interface QrMenuSettings {
    landing: {
        backgroundColor: string;
        textColor: string;
        fontFamily: string;
    };
    // Future tabs
    menu?: Record<string, any>;
    product?: Record<string, any>;
}

/**
 * Restaurant
 * Core restaurant information and settings
 */
export interface Restaurant {
    id: string;
    name: string;
    logoUrl: string | null;
    description: string;
    currency: Currency;

    // Contact & Location
    phone?: string;
    email?: string;
    address?: string;

    // Social Media
    socialMedia?: SocialMedia[];

    // Operating Hours
    openingHours?: OpeningHours[];

    // QR Settings
    qrSettings?: QrSettings;

    // Appearance Settings
    appearance?: {
        imagePosition?: 'right' | 'left' | 'top' | 'grid';
        showDescription?: boolean;
        headerImageUrl?: string | null;
    };

    createdAt: Date;
    updatedAt: Date;
}

export type CategoryNavLayout = 'text' | 'image' | 'both' | 'vertical';

export interface MenuAppearance {
    imagePosition?: 'right' | 'left' | 'top' | 'grid';
    showDescription?: boolean;
    showPopular?: boolean;
    popularLayout?: 'grid' | 'scroll';
    showDiscounted?: boolean;
    discountedLayout?: 'grid' | 'scroll';
    categoryNavLayout?: CategoryNavLayout;
}

/**
 * Menu
 * A menu belongs to a restaurant and contains categories
 */
export interface Menu {
    id: string;
    name: string;
    orderValue: number;
    isActive: boolean;
    restaurantId: string;
    appearance?: MenuAppearance;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Category
 * A category belongs to a menu and contains products
 */
export interface Category {
    id: string;
    name: string;
    description: string | null;
    imageUrl: string | null;
    position: string; // Fractional indexing position (e.g., "a0", "a1", "a0V")
    menuId: string;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Product Variation Type
 */
export type VariationType = 'porsiyon' | 'boy' | 'gramaj' | 'adet' | 'ozel';

export const VARIATION_TYPES: { value: VariationType; label: string }[] = [
    { value: 'porsiyon', label: 'Porsiyon' },
    { value: 'boy', label: 'Boy' },
    { value: 'gramaj', label: 'Gramaj' },
    { value: 'adet', label: 'Adet' },
    { value: 'ozel', label: 'Özel' },
];

export interface ProductVariation {
    type: VariationType;
    unit: string;
    price: number;
}

/**
 * Product Discount Configuration
 */
export interface ProductDiscount {
    enabled: boolean;
    discountedPrice: number;
    hasSchedule?: boolean;
    startDate?: string; // 'YYYY-MM-DD'
    endDate?: string;   // 'YYYY-MM-DD'
    startTime?: string; // 'HH:mm'
    endTime?: string;   // 'HH:mm'
    days?: string[];    // ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
}

/**
 * Checks whether a discount is currently active based on schedule
 */
export function isDiscountActive(product?: { discount?: ProductDiscount | null; price?: number } | null): boolean {
    if (!product || !product.discount) return false;
    const { discount } = product;
    if (!discount.enabled) return false;
    if (typeof discount.discountedPrice !== 'number' || discount.discountedPrice <= 0) return false;
    if (product.price && discount.discountedPrice >= product.price) return false;

    // If no schedule specified, always active
    if (!discount.hasSchedule) return true;

    const now = new Date();

    // Date range check (using local dates)
    if (discount.startDate) {
        const start = new Date(discount.startDate + 'T00:00:00');
        if (now < start) return false;
    }
    if (discount.endDate) {
        const end = new Date(discount.endDate + 'T23:59:59');
        if (now > end) return false;
    }

    // Days of week check
    if (discount.days && discount.days.length > 0) {
        const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const currentDay = dayMap[now.getDay()];
        if (!discount.days.includes(currentDay)) return false;
    }

    // Time window check (e.g. 12:00 - 15:00)
    if (discount.startTime || discount.endTime) {
        const currentHours = String(now.getHours()).padStart(2, '0');
        const currentMinutes = String(now.getMinutes()).padStart(2, '0');
        const currentTime = `${currentHours}:${currentMinutes}`;

        if (discount.startTime && currentTime < discount.startTime) return false;
        if (discount.endTime && currentTime > discount.endTime) return false;
    }

    return true;
}

/**
 * Product
 * A product belongs to a category
 */
export interface Product {
    id: string;
    name: string;
    description: string | null;
    price: number;
    imageUrl: string | null;
    position: string; // Changed from order: number
    categoryId: string;
    tags?: ProductTag[];
    available: boolean; // Renamed from isAvailable
    active: boolean; // Renamed from isPublic
    presence?: Record<string, string[]>; // Changed from availabilityHours
    variations?: ProductVariation[];
    discount?: ProductDiscount | null;
    calories?: number;
    cookingTime?: number; // minutes
    allergens?: string[];
    contentWarnings?: string[];
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Menu with full details (includes categories and products)
 * Used for detailed menu view
 */
export interface MenuWithDetails extends Menu {
    categories: CategoryWithProducts[];
}

/**
 * Category with products
 * Used for menu display
 */
export interface CategoryWithProducts extends Category {
    products: Product[];
}

/**
 * API Response wrapper types
 */
export interface ApiResponse<T> {
    data: T;
    message?: string;
}

export interface ApiError {
    error: string;
    details?: any;
}
