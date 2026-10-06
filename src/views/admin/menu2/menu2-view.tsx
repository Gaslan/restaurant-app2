'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
    Plus,
    QrCode,
    Search,
    ArrowUpDown,
    Loader2,
    Layers,
    Pencil,
    Trash2,
    ChevronRight,
    UtensilsCrossed,
    Eye,
    MoreVertical,
    CheckSquare,
    ChevronUp,
    Tag,
} from 'lucide-react';

import type {
    Menu,
    Category,
    CategoryWithProducts,
    MenuWithDetails,
    Product,
} from '@/types';
import type { CategoryFormData, ProductFormData } from '@/lib/validations';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import { comparePositions } from '@/lib/utils';
import { Button, Input, Select, Badge, Switcher, Dropdown } from '@/components/ui';
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/vaul-drawer';
import ConfirmDialog from '@/components/shared/ConfirmDialog';

import { CategoryDrawer } from '@/views/admin/categories/category-drawer';
import { DeleteCategoryDialog } from '@/views/admin/categories/delete-category-dialog';
import { ProductDrawer } from '@/views/admin/products/product-drawer';
import { DeleteProductDialog } from '@/views/admin/products/delete-product-dialog';
import { CategoryReorderModal } from './category-reorder-modal';
import { CategorySection } from './category-section';
import { BatchPriceModal } from './batch-price-modal';

export function Menu2View() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialMenuIdParam = searchParams.get('menuId');

    const [menus, setMenus] = useState<Menu[]>([]);
    const [selectedMenuId, setSelectedMenuId] = useState<string>('');
    const [menuData, setMenuData] = useState<MenuWithDetails | null>(null);
    const [currency, setCurrency] = useState('TRY');
    const [isLoading, setIsLoading] = useState(true);
    const [isMenuDetailsLoading, setIsMenuDetailsLoading] = useState(false);

    // Filters
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<{ value: string; label: string }>({
        value: 'all',
        label: 'Tüm Durumlar',
    });

    // Dialog & Drawer states
    const [reorderModalOpen, setReorderModalOpen] = useState(false);

    const [categoryDialog, setCategoryDialog] = useState<{
        open: boolean;
        category?: CategoryWithProducts;
        afterCategoryId?: string;
    }>({ open: false });

    const [deleteCategoryDialog, setDeleteCategoryDialog] = useState<{
        open: boolean;
        category?: CategoryWithProducts;
    }>({ open: false });

    const [productDrawer, setProductDrawer] = useState<{
        open: boolean;
        categoryId: string;
        product?: Product;
    }>({ open: false, categoryId: '' });

    const [deleteProductDialog, setDeleteProductDialog] = useState<{
        open: boolean;
        categoryId: string;
        product?: Product;
    }>({ open: false, categoryId: '' });

    // Mobile action drawer states
    const [mobileProductDrawer, setMobileProductDrawer] = useState<{
        open: boolean;
        product?: Product;
        categoryId: string;
    }>({ open: false, categoryId: '' });

    // Bulk selection states
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
    const [batchDeleteConfirmOpen, setBatchDeleteConfirmOpen] = useState(false);
    const [isBatchDeleting, setIsBatchDeleting] = useState(false);
    const [batchPriceModalOpen, setBatchPriceModalOpen] = useState(false);

    // 1. Initial Load: Fetch all menus & restaurant info
    useEffect(() => {
        async function init() {
            try {
                setIsLoading(true);
                const [menusRes, restaurantRes] = await Promise.all([
                    apiGet<Menu[]>('/api/menus'),
                    apiGet<{ currency?: string }>('/api/restaurant').catch(() => ({ data: { currency: 'TRY' } })),
                ]);

                if (restaurantRes?.data?.currency) {
                    setCurrency(restaurantRes.data.currency);
                }

                const allMenus = menusRes.data || [];
                setMenus(allMenus);

                if (allMenus.length > 0) {
                    // Check if initialMenuIdParam is valid
                    const matchedMenu = initialMenuIdParam
                        ? allMenus.find((m) => m.id === initialMenuIdParam)
                        : null;

                    const targetId = matchedMenu ? matchedMenu.id : allMenus[0].id;
                    setSelectedMenuId(targetId);
                    await fetchMenuDetails(targetId);
                }
            } catch (error) {
                console.error('Failed to initialize menu2:', error);
                toast.error('Menüler yüklenirken bir hata oluştu');
            } finally {
                setIsLoading(false);
            }
        }

        init();
    }, [initialMenuIdParam]);

    // Fetch full menu details (categories + products)
    const fetchMenuDetails = useCallback(async (menuId: string) => {
        if (!menuId) return;
        try {
            setIsMenuDetailsLoading(true);
            const res = await apiGet<MenuWithDetails>(`/api/menus/${menuId}`);
            if (res.data) {
                // Sort categories and their products with comparePositions
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

    // Toggle menu active state
    const handleToggleMenuActive = async (checked: boolean) => {
        if (!selectedMenuId) return;
        try {
            await apiPatch<Menu>(`/api/menus/${selectedMenuId}`, { isActive: checked });
            setMenus((prev) =>
                prev.map((m) => (m.id === selectedMenuId ? { ...m, isActive: checked } : m))
            );
            if (menuData) {
                setMenuData({ ...menuData, isActive: checked });
            }
            toast.success(checked ? 'Menü aktif hale getirildi' : 'Menü pasif hale getirildi');
        } catch (error) {
            toast.error('Menü durumu güncellenemedi');
        }
    };

    // Save Category (Create or Edit)
    const handleSaveCategory = async (data: CategoryFormData) => {
        if (!selectedMenuId) return;
        try {
            if (categoryDialog.category) {
                await apiPatch(
                    `/api/menus/${selectedMenuId}/categories/${categoryDialog.category.id}`,
                    data
                );
                toast.success('Kategori güncellendi');
            } else {
                await apiPost(`/api/menus/${selectedMenuId}/categories`, {
                    ...data,
                    menuId: selectedMenuId,
                    afterCategoryId: categoryDialog.afterCategoryId || null,
                });
                toast.success('Kategori oluşturuldu');
            }
            setCategoryDialog({ open: false, category: undefined, afterCategoryId: undefined });
            await fetchMenuDetails(selectedMenuId);
        } catch (error) {
            toast.error('Kategori kaydedilemedi');
            throw error;
        }
    };

    // Delete Category
    const handleDeleteCategory = async () => {
        if (!selectedMenuId || !deleteCategoryDialog.category) return;
        try {
            await apiDelete(
                `/api/menus/${selectedMenuId}/categories/${deleteCategoryDialog.category.id}`
            );
            toast.success('Kategori silindi');
            setDeleteCategoryDialog({ open: false });
            await fetchMenuDetails(selectedMenuId);
        } catch (error) {
            toast.error('Kategori silinemedi');
        }
    };

    // Reorder Categories
    const handleReorderCategories = async (
        oldIndex: number,
        newIndex: number,
        activeId: string
    ) => {
        if (!menuData || !selectedMenuId) return;

        const previousCategories = menuData.categories;
        const reordered = [...menuData.categories];
        const [moved] = reordered.splice(oldIndex, 1);
        reordered.splice(newIndex, 0, moved);

        // Optimistic UI update: Anında ekrana yansıt
        setMenuData({
            ...menuData,
            categories: reordered,
        });

        try {
            const res = await apiPatch<Category>(
                `/api/menus/${selectedMenuId}/categories/${activeId}/reorder`,
                {
                    beforeId: newIndex > 0 ? reordered[newIndex - 1].id : null,
                    afterId: newIndex < reordered.length - 1 ? reordered[newIndex + 1].id : null,
                    orderedCategoryIds: reordered.map((c) => c.id),
                }
            );

            // Backend'den dönen yeni pozisyonu kaydet
            if (res.data?.position) {
                setMenuData((prev) => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        categories: prev.categories.map((c) =>
                            c.id === activeId ? { ...c, position: res.data!.position } : c
                        ),
                    };
                });
            }

            toast.success('Kategori sıralaması güncellendi', { closeButton: false });
        } catch (error) {
            // Başarısız olursa sıralamayı eski haline geri al
            setMenuData((prev) =>
                prev ? { ...prev, categories: [...previousCategories] } : prev
            );
            toast.error('Kategori sıralaması güncellenemedi', { closeButton: false });
        }
    };

    // Quick move category up/down
    const handleMoveCategory = async (categoryId: string, direction: 'up' | 'down') => {
        if (!menuData) return;
        const currentIndex = menuData.categories.findIndex((c) => c.id === categoryId);
        if (currentIndex === -1) return;
        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= menuData.categories.length) return;
        await handleReorderCategories(currentIndex, targetIndex, categoryId);
    };

    // Save Product (Create or Edit)
    const handleSaveProduct = async (data: ProductFormData) => {
        if (!selectedMenuId || !productDrawer.categoryId) return;
        try {
            const productData = {
                ...data,
                menuId: selectedMenuId,
                categoryId: productDrawer.categoryId,
            };

            if (productDrawer.product) {
                await apiPatch(
                    `/api/products/${productDrawer.product.id}?menuId=${selectedMenuId}&categoryId=${productDrawer.categoryId}`,
                    productData
                );
                toast.success('Ürün güncellendi');
            } else {
                await apiPost('/api/products', productData);
                toast.success('Ürün oluşturuldu');
            }

            setProductDrawer({ open: false, categoryId: '' });
            await fetchMenuDetails(selectedMenuId);
        } catch (error) {
            toast.error('Ürün kaydedilemedi');
            throw error;
        }
    };

    // Delete Product
    const handleDeleteProduct = async () => {
        if (
            !selectedMenuId ||
            !deleteProductDialog.product ||
            !deleteProductDialog.categoryId
        )
            return;

        try {
            await apiDelete(
                `/api/products/${deleteProductDialog.product.id}?menuId=${selectedMenuId}&categoryId=${deleteProductDialog.categoryId}`
            );
            toast.success('Ürün silindi');
            setDeleteProductDialog({ open: false, categoryId: '' });
            await fetchMenuDetails(selectedMenuId);
        } catch (error) {
            toast.error('Ürün silinemedi');
        }
    };

    // Reorder Products within a Category
    const handleReorderProducts = async (
        categoryId: string,
        oldIndex: number,
        newIndex: number,
        activeId: string
    ) => {
        if (!menuData || !selectedMenuId) return;

        const targetCategory = menuData.categories.find((c) => c.id === categoryId);
        if (!targetCategory) return;

        const previousCategories = menuData.categories;
        const reorderedList = [...targetCategory.products];
        const [moved] = reorderedList.splice(oldIndex, 1);
        reorderedList.splice(newIndex, 0, moved);

        // Optimistic update: Anında ekrana yansıt
        setMenuData({
            ...menuData,
            categories: menuData.categories.map((c) =>
                c.id === categoryId ? { ...c, products: reorderedList } : c
            ),
        });

        try {
            const isFullList = searchQuery === '' && statusFilter.value === 'all';
            const res = await apiPatch<Product>(
                `/api/products/${activeId}/reorder?menuId=${selectedMenuId}&categoryId=${categoryId}`,
                {
                    previousProductId: newIndex > 0 ? reorderedList[newIndex - 1].id : null,
                    nextProductId:
                        newIndex < reorderedList.length - 1 ? reorderedList[newIndex + 1].id : null,
                    orderedProductIds: isFullList
                        ? reorderedList.map((p) => p.id)
                        : targetCategory.products.map((p) => p.id),
                }
            );

            // Yeni pozisyon değerini güncelleyelim
            if (res.data?.position) {
                setMenuData((prev) => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        categories: prev.categories.map((c) =>
                            c.id === categoryId
                                ? {
                                      ...c,
                                      products: c.products.map((p) =>
                                          p.id === activeId ? { ...p, position: res.data!.position } : p
                                      ),
                                  }
                                : c
                        ),
                    };
                });
            }

            toast.success('Ürün sırası güncellendi', { closeButton: false });
        } catch (error) {
            // Başarısız olursa eski haline geri al
            setMenuData((prev) =>
                prev ? { ...prev, categories: [...previousCategories] } : prev
            );
            toast.error('Sıralama güncellenemedi', { closeButton: false });
        }
    };

    // Bulk selection handlers
    const handleToggleSelectionMode = () => {
        setIsSelectionMode((prev) => {
            const next = !prev;
            if (!next) {
                setSelectedProductIds([]);
            }
            return next;
        });
    };

    const handleToggleSelectProduct = (productId: string) => {
        setSelectedProductIds((prev) =>
            prev.includes(productId)
                ? prev.filter((id) => id !== productId)
                : [...prev, productId]
        );
    };

    const handleSelectCategoryProducts = (
        categoryId: string,
        productIds: string[],
        selectAll: boolean
    ) => {
        setSelectedProductIds((prev) => {
            if (selectAll) {
                const toAdd = productIds.filter((id) => !prev.includes(id));
                return [...prev, ...toAdd];
            } else {
                return prev.filter((id) => !productIds.includes(id));
            }
        });
    };

    const handleExitSelectionMode = () => {
        setIsSelectionMode(false);
        setSelectedProductIds([]);
    };

    const handleBatchDeleteConfirm = async () => {
        if (!menuData || !selectedMenuId || selectedProductIds.length === 0) return;

        try {
            setIsBatchDeleting(true);

            // Find categoryId for each productId
            const productCategoryPairs: { productId: string; categoryId: string }[] = [];
            for (const cat of menuData.categories) {
                for (const prod of cat.products || []) {
                    if (selectedProductIds.includes(prod.id)) {
                        productCategoryPairs.push({ productId: prod.id, categoryId: cat.id });
                    }
                }
            }

            const count = selectedProductIds.length;

            // Optimistic update
            setMenuData((prev) => {
                if (!prev) return prev;
                return {
                    ...prev,
                    categories: prev.categories.map((cat) => ({
                        ...cat,
                        products: (cat.products || []).filter(
                            (p) => !selectedProductIds.includes(p.id)
                        ),
                    })),
                };
            });

            // Parallel delete requests
            await Promise.all(
                productCategoryPairs.map(({ productId, categoryId }) =>
                    apiDelete(
                        `/api/products/${productId}?menuId=${selectedMenuId}&categoryId=${categoryId}`
                    )
                )
            );

            toast.success(`${count} ürün başarıyla silindi`, { closeButton: false });
            setSelectedProductIds([]);
            setBatchDeleteConfirmOpen(false);
        } catch (error) {
            console.error('Batch delete failed:', error);
            toast.error('Bazı ürünler silinirken bir hata oluştu', { closeButton: false });
            if (selectedMenuId) {
                await fetchMenuDetails(selectedMenuId);
            }
        } finally {
            setIsBatchDeleting(false);
        }
    };

    // Statistics
    const totalCategoriesCount = menuData?.categories?.length || 0;
    const totalProductsCount = useMemo(() => {
        return (menuData?.categories || []).reduce(
            (acc, cat) => acc + (cat.products?.length || 0),
            0
        );
    }, [menuData]);

    // Categories to display
    const visibleCategories = menuData?.categories || [];

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-80 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Menü yükleniyor...</p>
            </div>
        );
    }

    if (menus.length === 0) {
        return (
            <div className="text-center py-16 border rounded-xl bg-card">
                <UtensilsCrossed className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <h3 className="text-xl font-bold mb-2">Henüz Menü Bulunmuyor</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto text-sm">
                    Kategorileri ve ürünleri yönetmeye başlamak için önce bir menü oluşturmalısınız.
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
        <div className="w-full space-y-6 pb-10 md:pb-14">
            {/* 1. Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 px-3 sm:px-0">
                <div className="space-y-1">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl font-bold tracking-tight">
                            {currentMenu?.name}
                        </h1>

                        {currentMenu && (
                            <div className="flex items-center gap-2">
                                <Switcher
                                    checked={currentMenu.isActive}
                                    onChange={(checked) => handleToggleMenuActive(checked)}
                                />
                                <Badge
                                    className={`border text-xs ${
                                        currentMenu.isActive ? 'border-green-500' : 'border-gray-400'
                                    }`}
                                    content={currentMenu.isActive ? 'Aktif' : 'Pasif'}
                                    innerClass={`bg-white dark:bg-gray-900 ${
                                        currentMenu.isActive
                                            ? 'text-green-600 dark:text-green-400'
                                            : 'text-gray-400'
                                    }`}
                                />
                            </div>
                        )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                        {totalCategoriesCount} Kategori • {totalProductsCount} Ürün
                    </p>
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Search Toggle Button */}
                    <Button
                        size="sm"
                        variant={showSearch || searchQuery !== '' || statusFilter.value !== 'all' ? 'solid' : 'default'}
                        icon={<Search className="h-4 w-4" />}
                        onClick={() => {
                            if (showSearch) {
                                setSearchQuery('');
                                setStatusFilter({ label: 'Tüm Durumlar', value: 'all' });
                            }
                            setShowSearch(!showSearch);
                        }}
                        className="rounded-full"
                        title="Arama ve Filtreleme"
                    >
                        <span>Ara</span>
                    </Button>

                    {/* Ön İzleme Button */}
                    {currentMenu && (
                        <Button
                            size="sm"
                            onClick={() => window.open(`/qr/${currentMenu.id}`, '_blank')}
                            icon={<Eye className="h-4 w-4" />}
                            className="rounded-full"
                        >
                            <span>Ön İzleme</span>
                        </Button>
                    )}

                    {/* Actions Dropdown */}
                    <Dropdown
                        placement="bottom-end"
                        renderTitle={
                            <Button
                                size="sm"
                                icon={<MoreVertical className="h-4 w-4" />}
                                className="rounded-full"
                                title="İşlemler"
                            />
                        }
                    >
                        <Dropdown.Item
                            eventKey="bulk-select"
                            onClick={handleToggleSelectionMode}
                            className="flex items-center gap-2 cursor-pointer"
                        >
                            <CheckSquare
                                className={`h-4 w-4 ${isSelectionMode ? 'text-primary' : 'text-gray-500'}`}
                            />
                            <span>{isSelectionMode ? 'Toplu Seçimi Kapat' : 'Toplu Seçim'}</span>
                        </Dropdown.Item>

                        <Dropdown.Item
                            eventKey="reorder-categories"
                            disabled={totalCategoriesCount <= 1}
                            onClick={() => totalCategoriesCount > 1 && setReorderModalOpen(true)}
                            className={`flex items-center gap-2 ${
                                totalCategoriesCount <= 1 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                            }`}
                        >
                            <ArrowUpDown className="h-4 w-4 text-gray-500" />
                            <span>Kategorileri Sırala</span>
                        </Dropdown.Item>

                        <Dropdown.Item
                            eventKey="add-category"
                            onClick={() => setCategoryDialog({ open: true, category: undefined })}
                            className="flex items-center gap-2 cursor-pointer"
                        >
                            <Plus className="h-4 w-4 text-gray-500" />
                            <span>Yeni Kategori Ekle</span>
                        </Dropdown.Item>

                        {currentMenu && (
                            <>
                                <Dropdown.Item variant="divider" />
                                <Dropdown.Item
                                    eventKey="qr-settings"
                                    onClick={() => router.push(`/settings/qr-code?menuId=${currentMenu.id}`)}
                                    className="flex items-center gap-2 cursor-pointer"
                                >
                                    <QrCode className="h-4 w-4 text-gray-500" />
                                    <span>QR Kod Ayarları</span>
                                </Dropdown.Item>
                            </>
                        )}
                    </Dropdown>
                </div>
            </div>

            {/* 2. Controls & Search & Filter Bar (Normally hidden, toggled via Search button) */}
            {showSearch && (
                <div className="w-full flex flex-col md:flex-row gap-3 justify-between items-center bg-gray-50/70 dark:bg-gray-800/40 p-3 rounded-none sm:rounded-xl border-y sm:border border-gray-200/80 dark:border-gray-800 transition-all">
                    {/* Search Bar */}
                    <div className="relative w-full md:w-80">
                        <Input
                            placeholder="Menüde veya ürünlerde ara..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 h-9 text-sm"
                            autoFocus
                        />
                        <Search className="absolute left-3 top-4 h-4 w-4 text-muted-foreground" />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-4 text-xs text-muted-foreground hover:text-foreground"
                            >
                                Temizle
                            </button>
                        )}
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <Select
                            size="sm"
                            options={[
                                { label: 'Tüm Durumlar', value: 'all' },
                                { label: 'Müsait', value: 'available' },
                                { label: 'Tükendi', value: 'unavailable' },
                            ]}
                            value={statusFilter}
                            onChange={(opt: any) => opt && setStatusFilter(opt)}
                            className="w-full md:w-44"
                        />
                    </div>
                </div>
            )}

            {/* Category Sections List */}
            {isMenuDetailsLoading && !menuData ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Detaylar güncelleniyor...</p>
                </div>
            ) : totalCategoriesCount === 0 ? (
                <div className="text-center py-16 border rounded-xl bg-card">
                    <Layers className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                    <h3 className="text-lg font-bold mb-1">Bu menüde henüz kategori yok</h3>
                    <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                        Müşterilerinize ürünlerinizi sunmak için önce kategoriler oluşturmalısınız.
                    </p>
                    <Button
                        variant="solid"
                        onClick={() => setCategoryDialog({ open: true })}
                        className="rounded-full"
                        icon={<Plus className="h-4 w-4" />}
                    >
                        İlk Kategoriyi Ekle
                    </Button>
                </div>
            ) : (
                <div className="w-full space-y-4">
                    {visibleCategories.map((category, index) => (
                        <CategorySection
                            key={category.id}
                            category={category}
                            currency={currency}
                            isFirst={index === 0}
                            isLast={index === visibleCategories.length - 1}
                            searchQuery={searchQuery}
                            statusFilter={statusFilter.value}
                            isSelectionMode={isSelectionMode}
                            selectedProductIds={selectedProductIds}
                            onToggleSelectProduct={handleToggleSelectProduct}
                            onSelectCategoryProducts={handleSelectCategoryProducts}
                            onAddProduct={(catId) =>
                                setProductDrawer({ open: true, categoryId: catId, product: undefined })
                            }
                            onAddCategoryAfter={(catId) =>
                                setCategoryDialog({ open: true, category: undefined, afterCategoryId: catId })
                            }
                            onEditCategory={(cat) =>
                                setCategoryDialog({ open: true, category: cat })
                            }
                            onDeleteCategory={(cat) =>
                                setDeleteCategoryDialog({ open: true, category: cat })
                            }
                            onMoveCategory={handleMoveCategory}
                            onEditProduct={(prod, catId) =>
                                setProductDrawer({ open: true, categoryId: catId, product: prod })
                            }
                            onDeleteProduct={(prod, catId) =>
                                setDeleteProductDialog({
                                    open: true,
                                    categoryId: catId,
                                    product: prod,
                                })
                            }
                            onProductDrawerOpen={(prod, catId) =>
                                setMobileProductDrawer({
                                    open: true,
                                    product: prod,
                                    categoryId: catId,
                                })
                            }
                            onReorderProducts={handleReorderProducts}
                        />
                    ))}
                </div>
            )}

            {/* 5. Modals and Drawers */}
            {selectedMenuId && (
                <>
                    {/* Category Add/Edit Drawer */}
                    <CategoryDrawer
                        open={categoryDialog.open}
                        onOpenChange={(open) =>
                            setCategoryDialog((prev) => ({
                                ...prev,
                                open,
                                ...(!open ? { afterCategoryId: undefined, category: undefined } : {}),
                            }))
                        }
                        onSave={handleSaveCategory}
                        category={categoryDialog.category}
                        menuId={selectedMenuId}
                    />

                    {/* Category Delete Confirm Dialog */}
                    <DeleteCategoryDialog
                        open={deleteCategoryDialog.open}
                        onOpenChange={(open) => setDeleteCategoryDialog({ open })}
                        onConfirm={handleDeleteCategory}
                        categoryName={deleteCategoryDialog.category?.name || ''}
                    />

                    {/* Product Add/Edit Drawer */}
                    <ProductDrawer
                        open={productDrawer.open}
                        onOpenChange={(open) =>
                            setProductDrawer((prev) => ({ ...prev, open }))
                        }
                        onSave={handleSaveProduct}
                        product={productDrawer.product}
                        categoryId={productDrawer.categoryId}
                    />

                    {/* Product Delete Confirm Dialog */}
                    <DeleteProductDialog
                        open={deleteProductDialog.open}
                        onOpenChange={(open) =>
                            setDeleteProductDialog((prev) => ({ ...prev, open }))
                        }
                        onConfirm={handleDeleteProduct}
                        productName={deleteProductDialog.product?.name || ''}
                    />

                    {/* Category Reorder Modal */}
                    <CategoryReorderModal
                        open={reorderModalOpen}
                        onOpenChange={setReorderModalOpen}
                        categories={menuData?.categories || []}
                        onReorder={handleReorderCategories}
                    />

                    {/* Mobile Product Action Drawer */}
                    <Drawer
                        open={mobileProductDrawer.open}
                        onOpenChange={(open) =>
                            setMobileProductDrawer((prev) => ({ ...prev, open }))
                        }
                    >
                        <DrawerContent className="bg-neutral">
                            <DrawerHeader>
                                <DrawerTitle>
                                    {mobileProductDrawer.product?.name}
                                </DrawerTitle>
                                <DrawerDescription>
                                    Ürün için bir işlem seçin
                                </DrawerDescription>
                            </DrawerHeader>
                            <div className="px-4 pb-4 space-y-3">
                                <Button
                                    size="lg"
                                    variant="default"
                                    icon={<Pencil className="h-4 w-4" />}
                                    className="w-full justify-start"
                                    onClick={() => {
                                        const prod = mobileProductDrawer.product;
                                        const catId = mobileProductDrawer.categoryId;
                                        setMobileProductDrawer({ open: false, categoryId: '' });
                                        if (prod && catId) {
                                            setProductDrawer({
                                                open: true,
                                                categoryId: catId,
                                                product: prod,
                                            });
                                        }
                                    }}
                                >
                                    <span>Ürünü Düzenle</span>
                                </Button>

                                <Button
                                    size="lg"
                                    variant="default"
                                    icon={<Trash2 className="h-4 w-4" />}
                                    className="w-full justify-start text-red-500 border-red-500 hover:text-red-500 hover:border-red-500 bg-red-500/0 hover:bg-red-500/10 hover:ring-0"
                                    onClick={() => {
                                        const prod = mobileProductDrawer.product;
                                        const catId = mobileProductDrawer.categoryId;
                                        setMobileProductDrawer({ open: false, categoryId: '' });
                                        if (prod && catId) {
                                            setDeleteProductDialog({
                                                open: true,
                                                categoryId: catId,
                                                product: prod,
                                            });
                                        }
                                    }}
                                >
                                    <span>Ürünü Sil</span>
                                </Button>
                            </div>
                        </DrawerContent>
                    </Drawer>

                    {/* Floating Bulk Actions Panel */}
                    {selectedProductIds.length > 0 && (
                        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl rounded-2xl px-4 py-3 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                                    <CheckSquare className="h-4 w-4" />
                                </div>
                                <span className="text-sm font-semibold truncate text-gray-900 dark:text-gray-100">
                                    {selectedProductIds.length} ürün seçildi
                                </span>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                                <Button
                                    size="sm"
                                    variant="default"
                                    className="rounded-full text-xs"
                                    onClick={handleExitSelectionMode}
                                >
                                    Vazgeç
                                </Button>

                                <Dropdown
                                    placement="top-end"
                                    renderTitle={
                                        <Button
                                            size="sm"
                                            variant="solid"
                                            className="rounded-full flex items-center gap-1.5"
                                        >
                                            <span>İşlemler</span>
                                            <ChevronUp className="h-3.5 w-3.5" />
                                        </Button>
                                    }
                                >
                                    <Dropdown.Item
                                        eventKey="change-price"
                                        onClick={() => setBatchPriceModalOpen(true)}
                                        className="flex items-center gap-2 cursor-pointer"
                                    >
                                        <Tag className="h-4 w-4 text-gray-500" />
                                        <span>Fiyat Değiştir</span>
                                    </Dropdown.Item>

                                    <Dropdown.Item variant="divider" />

                                    <Dropdown.Item
                                        eventKey="batch-delete"
                                        onClick={() => setBatchDeleteConfirmOpen(true)}
                                        className="flex items-center gap-2 cursor-pointer text-red-600 hover:text-red-600 dark:text-red-400"
                                    >
                                        <Trash2 className="h-4 w-4 text-red-500" />
                                        <span>Sil</span>
                                    </Dropdown.Item>
                                </Dropdown>
                            </div>
                        </div>
                    )}

                    {/* Batch Delete Confirmation Dialog */}
                    <ConfirmDialog
                        isOpen={batchDeleteConfirmOpen}
                        type="danger"
                        title="Seçili Ürünleri Sil"
                        confirmText="Sil"
                        cancelText="Vazgeç"
                        confirmButtonProps={{ loading: isBatchDeleting }}
                        onCancel={() => setBatchDeleteConfirmOpen(false)}
                        onConfirm={handleBatchDeleteConfirm}
                    >
                        <p>
                            Seçilen <strong>{selectedProductIds.length}</strong> ürünü silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                        </p>
                    </ConfirmDialog>

                    {/* Batch Price Change Modal */}
                    <BatchPriceModal
                        open={batchPriceModalOpen}
                        onOpenChange={setBatchPriceModalOpen}
                        selectedCount={selectedProductIds.length}
                        currency={currency}
                        onApply={(formData) => {
                            console.log('Batch price data:', formData);
                        }}
                    />
                </>
            )}
        </div>
    );
}
