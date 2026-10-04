'use client';

import { useState, useEffect, use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Pencil, Trash2, Plus, ChevronRight, GripVertical, ImageIcon, ArrowLeft, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import type { CategoryWithProducts, Product } from '@/types';
import type { ProductFormData } from '@/lib/validations';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';

import { Button, Input, Select, Badge } from '@/components/ui';
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/vaul-drawer';
import Table from '@/components/ui/Table';
import AdaptiveCard from '@/components/shared/AdaptiveCard';
import classNames from '@/utils/classNames';

import { ProductDrawer } from '@/views/admin/products/product-drawer';
import { DeleteProductDialog } from '@/views/admin/products/delete-product-dialog';

const formatPrice = (price: number, currency = 'TRY') => {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: currency,
    }).format(price);
};

interface CategoryDetailPageProps {
    params: Promise<{ menuId: string; categoryId: string }>;
}

// Sortable row component for products
function SortableProductRow({
    product,
    currency,
    onDrawerOpen,
    onEdit,
    onDelete
}: {
    product: Product;
    currency: string;
    onDrawerOpen: (prod: Product) => void;
    onEdit: (prod: Product) => void;
    onDelete: (prod: Product) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: product.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <Table.Tr
            ref={setNodeRef}
            style={style}
            className={classNames(
                "cursor-pointer md:cursor-default",
                isDragging ? "bg-gray-50 z-10 relative" : ""
            )}
            onClick={(e) => {
                const target = e.target as HTMLElement;
                if (window.innerWidth < 768 && !target.closest('button') && !target.closest('[data-drag-handle]')) {
                    e.preventDefault();
                    onDrawerOpen(product);
                }
            }}
        >
            {/* Drag handle */}
            <Table.Td className="w-12 p-4">
                <button
                    className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400 focus:outline-none"
                    style={{ touchAction: 'none' }}
                    data-drag-handle
                    {...attributes}
                    {...listeners}
                >
                    <GripVertical className="h-4 w-4" />
                </button>
            </Table.Td>

            <Table.Td className="w-16 p-4">
                {product.imageUrl ? (
                    <div className="relative w-10 h-10 rounded overflow-hidden border border-gray-200">
                        <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="object-cover w-full h-full"
                        />
                    </div>
                ) : (
                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center border border-gray-200">
                        <ImageIcon className="w-5 h-5 text-gray-400" />
                    </div>
                )}
            </Table.Td>
            <Table.Td className="font-semibold heading-text p-4">{product.name}</Table.Td>
            <Table.Td className="text-muted-foreground p-4">{formatPrice(product.price, currency)}</Table.Td>
            <Table.Td className="p-4">
                <Badge
                    className={classNames('border border-gray-400', product.available ? 'border-green-500' : 'border-gray-400')}
                    content={product.available ? 'Müsait' : 'Tükendi'}
                    innerClass={classNames('bg-white text-gray-500', product.available ? 'text-green-500' : 'text-gray-400')}
                />
            </Table.Td>
            <Table.Td className="text-right p-4">
                {/* Desktop: Show inline action buttons */}
                <div className="hidden md:flex gap-2 justify-end items-center" onClick={(e) => e.stopPropagation()}>
                    <Button
                        size="xs"
                        icon={<Pencil className="h-3.5 w-3.5" />}
                        onClick={() => onEdit(product)}
                    >
                        Düzenle
                    </Button>
                    <Button
                        size="xs"
                        icon={<Trash2 className="h-3.5 w-3.5" />}
                        onClick={() => onDelete(product)}
                    >
                        Sil
                    </Button>
                </div>
                {/* Mobile: Show chevron */}
                <div className="md:hidden flex justify-end">
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
            </Table.Td>
        </Table.Tr>
    );
}

export default function CategoryDetailPage({ params }: CategoryDetailPageProps) {
    const { menuId, categoryId } = use(params);
    const router = useRouter();

    const [category, setCategory] = useState<CategoryWithProducts | null>(null);
    const [currency, setCurrency] = useState('TRY');
    const [isLoading, setIsLoading] = useState(true);

    // Dialog states
    const [productDrawer, setProductDrawer] = useState<{
        open: boolean;
        product?: Product;
    }>({ open: false });
    const [deleteProductDialog, setDeleteProductDialog] = useState<{
        open: boolean;
        product?: Product;
    }>({ open: false });

    // Drawer state for mobile
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerProduct, setDrawerProduct] = useState<Product | undefined>();

    // Search and filter state
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<{ value: string; label: string }>({ value: 'all', label: 'Tümü' });

    // Optimistic state for drag-and-drop
    const [optimisticProducts, setOptimisticProducts] = useState<Product[] | null>(null);

    // Drag-and-drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const fetchData = async () => {
        try {
            const [menuData, restaurantData] = await Promise.all([
                apiGet<any>(`/api/menus/${menuId}`),
                apiGet<any>('/api/restaurant'),
            ]);

            if (menuData.data) {
                const foundCategory = menuData.data.categories.find(
                    (c: CategoryWithProducts) => c.id === categoryId
                );
                if (foundCategory) {
                    setCategory(foundCategory);
                } else {
                    toast.error('Kategori bulunamadı');
                    router.push(`/menus/${menuId}`);
                }
            }

            if (restaurantData.data) {
                setCurrency(restaurantData.data.currency);
            }
        } catch (error) {
            console.error('Failed to fetch data:', error);
            toast.error('Veri yüklenemedi');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [menuId, categoryId]);

    // Filter products
    const filteredProducts = useMemo(() => {
        if (!category) return [];

        return category.products.filter(product => {
            const matchesSearch =
                searchQuery === '' ||
                product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                false;

            const matchesStatus =
                statusFilter.value === 'all' ||
                (statusFilter.value === 'available' && product.available) ||
                (statusFilter.value === 'unavailable' && !product.available);

            return matchesSearch && matchesStatus;
        }).sort((a, b) => a.position.localeCompare(b.position));
    }, [category, searchQuery, statusFilter]);

    const displayProducts = optimisticProducts || filteredProducts;

    const handleSaveProduct = async (data: ProductFormData) => {
        try {
            const productData = { ...data, menuId, categoryId };

            if (productDrawer.product) {
                await apiPatch(`/api/products/${productDrawer.product.id}?menuId=${menuId}&categoryId=${categoryId}`, productData);
                toast.success('Ürün güncellendi');
            } else {
                await apiPost('/api/products', productData);
                toast.success('Ürün oluşturuldu');
            }
            setProductDrawer({ open: false });
            await fetchData();
        } catch (error) {
            toast.error('Ürün kaydedilemedi');
            throw error;
        }
    };

    const handleDeleteProduct = async () => {
        if (!deleteProductDialog.product) return;

        try {
            await apiDelete(`/api/products/${deleteProductDialog.product.id}?menuId=${menuId}&categoryId=${categoryId}`);
            toast.success('Ürün silindi');
            setDeleteProductDialog({ open: false });
            await fetchData();
        } catch (error) {
            toast.error('Ürün silinemedi');
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over || active.id === over.id || !category) {
            return;
        }

        const oldIndex = filteredProducts.findIndex((p) => p.id === active.id);
        const newIndex = filteredProducts.findIndex((p) => p.id === over.id);

        if (oldIndex === -1 || newIndex === -1) {
            return;
        }

        const reorderedFiltered = [...filteredProducts];
        const [moved] = reorderedFiltered.splice(oldIndex, 1);
        reorderedFiltered.splice(newIndex, 0, moved);
        setOptimisticProducts(reorderedFiltered);

        const reorderedProducts = [...category.products];
        const allOldIndex = reorderedProducts.findIndex((p) => p.id === active.id);
        const allNewIndex = reorderedProducts.findIndex((p) => p.id === over.id);
        const [movedProduct] = reorderedProducts.splice(allOldIndex, 1);
        reorderedProducts.splice(allNewIndex, 0, movedProduct);

        setCategory({
            ...category,
            products: reorderedProducts,
        });

        try {
            await apiPatch(`/api/products/${active.id}/reorder?menuId=${menuId}&categoryId=${categoryId}`, {
                previousProductId: newIndex > 0 ? reorderedFiltered[newIndex - 1].id : null,
                nextProductId: newIndex < reorderedFiltered.length - 1 ? reorderedFiltered[newIndex + 1].id : null,
            });
            toast.success('Ürün sırası güncellendi');
            await fetchData();
            setOptimisticProducts(null);
        } catch (error) {
            await fetchData();
            setOptimisticProducts(null);
            toast.error('Sıralama güncellenemedi');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!category) {
        return (
            <div className="text-center py-12 border rounded-lg">
                <h1 className="text-2xl font-bold mb-4">Kategori Bulunamadı</h1>
                <Button variant="solid" onClick={() => router.push(`/menus/${menuId}`)} className="rounded-full">
                    <span>Kategorilere Dön</span>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{category.name}</h1>
                    <p className="text-muted-foreground">
                        {category.description || 'Bu kategoriye ait ürünleri ve sıralamalarını yönetin'}
                    </p>
                </div>

                <div className="flex flex-row gap-2">
                    <Button
                        variant="solid"
                        size="sm"
                        onClick={() => setProductDrawer({ open: true })}
                        icon={<Plus className="h-4 w-4" />}
                        className="rounded-full"
                    >
                        <span>Ürün Ekle</span>
                    </Button>
                </div>
            </div>

            {/* Products Table */}
            {category.products.length === 0 ? (
                <div className="text-center py-12 border rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">Bu kategoride henüz ürün yok</h3>
                    <p className="text-muted-foreground mb-4">
                        Müşterilerinize sunmak için bu kategoriye ilk ürününüzü ekleyin.
                    </p>
                    <Button
                        variant="solid"
                        onClick={() => setProductDrawer({ open: true })}
                        className="w-full md:w-auto rounded-full"
                        icon={<Plus className="h-4 w-4" />}
                    >
                        <span>İlk Ürünü Ekle</span>
                    </Button>
                </div>
            ) : (
                <div className="border-0 rounded-lg">
                    <AdaptiveCard>
                        <div className="mb-4 flex flex-col md:flex-row gap-3 justify-between items-center">
                            <p className="text-sm text-muted-foreground m-0">
                                {displayProducts.length} ürün listeleniyor. Sıralamayı değiştirmek için <GripVertical className="inline w-4 h-4 mx-1" /> simgesinden sürükleyin.
                            </p>
                            <div className="flex items-center gap-2 w-full md:w-auto">
                                <div className="relative w-full md:w-64">
                                    <Input
                                        placeholder="Ürün ara..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9 bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
                                    />
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                </div>
                                <Select
                                    options={[
                                        { label: 'Tümü', value: 'all' },
                                        { label: 'Müsait', value: 'available' },
                                        { label: 'Tükendi', value: 'unavailable' }
                                    ]}
                                    value={statusFilter}
                                    onChange={(option) => option && setStatusFilter(option as any)}
                                    className="w-40"
                                />
                            </div>
                        </div>

                        {displayProducts.length === 0 ? (
                            <div className="text-center py-12 border rounded-lg">
                                <p className="text-muted-foreground">
                                    Arama kriterlerinize uygun ürün bulunamadı.
                                </p>
                            </div>
                        ) : (
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <Table>
                                    <Table.THead>
                                        <Table.Tr>
                                            <Table.Th className="w-12 p-4"></Table.Th>
                                            <Table.Th className="w-16 p-4">Görsel</Table.Th>
                                            <Table.Th className="p-4">Ürün Adı</Table.Th>
                                            <Table.Th className="p-4">Fiyat</Table.Th>
                                            <Table.Th className="p-4">Durum</Table.Th>
                                            <Table.Th className="text-right p-4"></Table.Th>
                                        </Table.Tr>
                                    </Table.THead>
                                    <SortableContext
                                        items={displayProducts.map((p) => p.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <Table.TBody>
                                            {displayProducts.map((product) => (
                                                <SortableProductRow
                                                    key={product.id}
                                                    product={product}
                                                    currency={currency}
                                                    onDrawerOpen={(p) => {
                                                        setDrawerProduct(p);
                                                        setDrawerOpen(true);
                                                    }}
                                                    onEdit={(p) => setProductDrawer({ open: true, product: p })}
                                                    onDelete={(p) => setDeleteProductDialog({ open: true, product: p })}
                                                />
                                            ))}
                                        </Table.TBody>
                                    </SortableContext>
                                </Table>
                            </DndContext>
                        )}
                    </AdaptiveCard>
                </div>
            )}

            {/* Dialogs */}
            <ProductDrawer
                open={productDrawer.open}
                onOpenChange={(open) => setProductDrawer({ open })}
                onSave={handleSaveProduct}
                product={productDrawer.product}
                categoryId={categoryId as string}
            />

            <DeleteProductDialog
                open={deleteProductDialog.open}
                onOpenChange={(open) => setDeleteProductDialog({ open })}
                onConfirm={handleDeleteProduct}
                productName={deleteProductDialog.product?.name || ''}
            />

            {/* Mobile Actions Drawer */}
            <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
                <DrawerContent className="bg-neutral">
                    <DrawerHeader>
                        <DrawerTitle>{drawerProduct?.name}</DrawerTitle>
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
                                setDrawerOpen(false);
                                if (drawerProduct) setProductDrawer({ open: true, product: drawerProduct });
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
                                setDrawerOpen(false);
                                if (drawerProduct) setDeleteProductDialog({ open: true, product: drawerProduct });
                            }}
                        >
                            <span>Ürünü Sil</span>
                        </Button>
                    </div>
                </DrawerContent>
            </Drawer>
        </div>
    );
}
