// Restaurant Management System - Type Definitions

/**
 * Product Tag Enum
 * Represents various dietary and feature tags for menu items
 */
export enum ProductTag {
    VEGAN = 'VEGAN',
    VEGETARIAN = 'VEGETARIAN',
    SPICY = 'SPICY',
    GLUTEN_FREE = 'GLUTEN_FREE',
    DAIRY_FREE = 'DAIRY_FREE',
    NUT_FREE = 'NUT_FREE',
    POPULAR = 'POPULAR',
    NEW = 'NEW',
}

/**
 * Tag configuration with labels and icons
 */
export const TAG_CONFIG: Record<ProductTag, { label: string; icon: string }> = {
    [ProductTag.VEGAN]: { label: 'Vegan', icon: '🌱' },
    [ProductTag.VEGETARIAN]: { label: 'Vegetaryen', icon: '🥬' },
    [ProductTag.SPICY]: { label: 'Acılı', icon: '🌶️' },
    [ProductTag.GLUTEN_FREE]: { label: 'Glutensiz', icon: '🌾' },
    [ProductTag.DAIRY_FREE]: { label: 'Sütsüz', icon: '🥛' },
    [ProductTag.NUT_FREE]: { label: 'Fındıksız', icon: '🥜' },
    [ProductTag.POPULAR]: { label: 'Popüler', icon: '⭐' },
    [ProductTag.NEW]: { label: 'Yeni', icon: '🆕' },
};

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

    createdAt: Date;
    updatedAt: Date;
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
    calories?: number;
    cookingTime?: number; // minutes
    allergens?: string[];
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
