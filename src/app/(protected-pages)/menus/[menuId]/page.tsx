'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Pencil, Trash2, Plus, ChevronRight, QrCode, Eye, GripVertical, ImageIcon, Loader2 } from 'lucide-react';
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

import type { Menu, Category, MenuWithDetails, CategoryWithProducts } from '@/types';
import type { CategoryFormData } from '@/lib/validations';
import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';

import { Button } from '@/components/ui';
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

import { CategoryDrawer } from '@/views/admin/categories/category-drawer';
import { DeleteCategoryDialog } from '@/views/admin/categories/delete-category-dialog';

interface MenuDetailPageProps {
    params: Promise<{ menuId: string }>;
}

// Sortable row component
function SortableRow({
    category,
    menu,
    onDrawerOpen,
    onEdit,
    onDelete
}: {
    category: CategoryWithProducts;
    menu: MenuWithDetails;
    onDrawerOpen: (cat: CategoryWithProducts) => void;
    onEdit: (cat: CategoryWithProducts) => void;
    onDelete: (cat: CategoryWithProducts) => void;
}) {
    const router = useRouter();
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: category.id });

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
                if (window.innerWidth < 768 && !target.closest('button')) {
                    e.preventDefault();
                    onDrawerOpen(category);
                } else if (window.innerWidth >= 768 && !target.closest('button') && !target.closest('[data-drag-handle]')) {
                    router.push(`/menus/${menu.id}/categories/${category.id}`);
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
                {category.imageUrl ? (
                    <div className="relative w-10 h-10 rounded overflow-hidden border border-gray-200">
                        <img
                            src={category.imageUrl}
                            alt={category.name}
                            className="object-cover w-full h-full"
                        />
                    </div>
                ) : (
                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-center border border-gray-200">
                        <ImageIcon className="w-5 h-5 text-gray-400" />
                    </div>
                )}
            </Table.Td>
            <Table.Td className="font-semibold heading-text p-4">{category.name}</Table.Td>
            <Table.Td className="text-muted-foreground p-4 hidden md:table-cell">
                {category.description || '-'}
            </Table.Td>
            <Table.Td className="text-right p-4">
                {/* Desktop: Show inline action buttons */}
                <div className="hidden md:flex gap-2 justify-end items-center" onClick={(e) => e.stopPropagation()}>
                    <Button
                        size="xs"
                        icon={<Eye className="h-3.5 w-3.5" />}
                        onClick={() => router.push(`/menus/${menu.id}/categories/${category.id}`)}
                    >
                        Ürünler
                    </Button>
                    <Button
                        size="xs"
                        icon={<Pencil className="h-3.5 w-3.5" />}
                        onClick={() => onEdit(category)}
                    >
                        Düzenle
                    </Button>
                    <Button
                        size="xs"
                        icon={<Trash2 className="h-3.5 w-3.5" />}
                        onClick={() => onDelete(category)}
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

export default function MenuDetailPage({ params }: MenuDetailPageProps) {
    const { menuId } = use(params);
    const router = useRouter();

    const [menu, setMenu] = useState<MenuWithDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Dialog states
    const [categoryDialog, setCategoryDialog] = useState<{
        open: boolean;
        category?: CategoryWithProducts;
    }>({ open: false });
    const [deleteCategoryDialog, setDeleteCategoryDialog] = useState<{
        open: boolean;
        category?: CategoryWithProducts;
    }>({ open: false });

    // Drawer state for mobile
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerCategory, setDrawerCategory] = useState<CategoryWithProducts | undefined>();

    // Drag-and-drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Fetch menu with categories
    const fetchData = async () => {
        try {
            // Fetch menu basic info
            const menuData = await apiGet<Menu>(`/api/menus/${menuId}`);

            // Fetch categories for this menu
            const categoriesData = await apiGet<Category[]>(`/api/menus/${menuId}/categories`);

            if (menuData.data) {
                // Transform categories to CategoryWithProducts
                const categoriesWithProducts: CategoryWithProducts[] = (categoriesData.data || []).map(cat => ({
                    ...cat,
                    products: [], // Will be populated when viewing category details
                }));

                setMenu({
                    ...menuData.data,
                    categories: categoriesWithProducts,
                } as MenuWithDetails);
            }
        } catch (error) {
            console.error('Failed to fetch menu:', error);
            toast.error('Menü yüklenemedi');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [menuId]);

    // Category handlers
    const handleSaveCategory = async (data: CategoryFormData) => {
        try {
            if (categoryDialog.category) {
                // Update existing category
                await apiPatch(`/api/menus/${menuId}/categories/${categoryDialog.category.id}`, data);
                toast.success('Kategori güncellendi');
            } else {
                // Create new category
                await apiPost(`/api/menus/${menuId}/categories`, {
                    ...data,
                    menuId,
                });
                toast.success('Kategori oluşturuldu');
            }
            setCategoryDialog({ open: false });
            await fetchData();
        } catch (error) {
            toast.error('Kategori kaydedilemedi');
            throw error;
        }
    };

    const handleDeleteCategory = async () => {
        if (!deleteCategoryDialog.category) return;

        try {
            await apiDelete(`/api/menus/${menuId}/categories/${deleteCategoryDialog.category.id}`);
            toast.success('Kategori silindi');
            setDeleteCategoryDialog({ open: false });
            await fetchData();
        } catch (error) {
            toast.error('Kategori silinemedi');
        }
    };

    // Handle drag-and-drop reordering
    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over || active.id === over.id || !menu) {
            return;
        }

        const oldIndex = menu.categories.findIndex((cat) => cat.id === active.id);
        const newIndex = menu.categories.findIndex((cat) => cat.id === over.id);

        if (oldIndex === -1 || newIndex === -1) {
            return;
        }

        // Optimistically update UI
        const reorderedCategories = [...menu.categories];
        const [movedCategory] = reorderedCategories.splice(oldIndex, 1);
        reorderedCategories.splice(newIndex, 0, movedCategory);

        setMenu({
            ...menu,
            categories: reorderedCategories,
        });

        try {
            // Call reorder API
            await apiPatch(`/api/menus/${menu.id}/categories/${active.id}/reorder`, {
                beforeId: newIndex > 0 ? reorderedCategories[newIndex - 1].id : null,
                afterId: newIndex < reorderedCategories.length - 1 ? reorderedCategories[newIndex + 1].id : null,
            });
            toast.success('Kategori sırası güncellendi');
            // Refresh to get updated positions from backend
            await fetchData();
        } catch (error) {
            // Revert on error
            await fetchData();
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

    if (!menu) {
        return (
            <div className="text-center py-12 border rounded-lg">
                <h1 className="text-2xl font-bold mb-4">Menü Bulunamadı</h1>
                <Button variant="solid" onClick={() => router.push('/menus')} className="rounded-full">
                    <span>Menülere Dön</span>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{menu.name}</h1>
                    <p className="text-muted-foreground">
                        Bu menüye ait kategorileri ve sıralamalarını yönetin
                    </p>
                </div>

                <div className="flex flex-row gap-2">
                    <Button
                        size="sm"
                        onClick={() => router.push(`/settings/qr-code?menuId=${menu.id}`)}
                        icon={<QrCode className="h-4 w-4" />}
                        className="rounded-full"
                    >
                        <span>QR Kod</span>
                    </Button>
                    <Button
                        variant="solid"
                        size="sm"
                        onClick={() => setCategoryDialog({ open: true })}
                        icon={<Plus className="h-4 w-4" />}
                        className="rounded-full"
                    >
                        <span>Kategori Ekle</span>
                    </Button>
                </div>
            </div>

            {/* Categories Table */}
            {!menu.categories || menu.categories.length === 0 ? (
                <div className="text-center py-12 border rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">Bu menüde henüz kategori yok</h3>
                    <p className="text-muted-foreground mb-4">
                        Müşterilerinize ürünlerinizi sunmak için önce kategoriler oluşturmalısınız. (Örn: Çorbalar, Ana Yemekler)
                    </p>
                    <Button
                        variant="solid"
                        onClick={() => setCategoryDialog({ open: true })}
                        className="w-full md:w-auto rounded-full"
                        icon={<Plus className="h-4 w-4" />}
                    >
                        <span>İlk Kategoriyi Ekle</span>
                    </Button>
                </div>
            ) : (
                <div className="border-0 rounded-lg">
                    <AdaptiveCard>
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
                                        <Table.Th className="p-4">Kategori Adı</Table.Th>
                                        <Table.Th className="hidden md:table-cell p-4">Açıklama</Table.Th>
                                        <Table.Th className="text-right p-4"></Table.Th>
                                    </Table.Tr>
                                </Table.THead>
                                <SortableContext
                                    items={menu.categories.map((c) => c.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <Table.TBody>
                                        {menu.categories.map((category) => (
                                            <SortableRow
                                                key={category.id}
                                                category={category}
                                                menu={menu}
                                                onDrawerOpen={(cat) => {
                                                    setDrawerCategory(cat);
                                                    setDrawerOpen(true);
                                                }}
                                                onEdit={(cat) => setCategoryDialog({ open: true, category: cat })}
                                                onDelete={(cat) => setDeleteCategoryDialog({ open: true, category: cat })}
                                            />
                                        ))}
                                    </Table.TBody>
                                </SortableContext>
                            </Table>
                        </DndContext>
                    </AdaptiveCard>
                </div>
            )}

            {/* Dialogs */}
            {menu && (
                <>
                    <CategoryDrawer
                        open={categoryDialog.open}
                        onOpenChange={(open) => setCategoryDialog({ open })}
                        onSave={handleSaveCategory}
                        category={categoryDialog.category}
                        menuId={menu.id}
                    />

                    <DeleteCategoryDialog
                        open={deleteCategoryDialog.open}
                        onOpenChange={(open) => setDeleteCategoryDialog({ open })}
                        onConfirm={handleDeleteCategory}
                        categoryName={deleteCategoryDialog.category?.name || ''}
                    />
                </>
            )}

            {/* Mobile Drawer for Category Actions */}
            <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
                <DrawerContent className="bg-neutral">
                    <DrawerHeader>
                        <DrawerTitle>{drawerCategory?.name}</DrawerTitle>
                        <DrawerDescription>
                            {drawerCategory?.description || 'Kategori aksiyonlarını seçin'}
                        </DrawerDescription>
                    </DrawerHeader>
                    <div className="px-4 pb-4 space-y-3">
                        <Button
                            size="lg"
                            variant="default"
                            icon={<Eye className="h-4 w-4" />}
                            className="w-full justify-start"
                            onClick={() => {
                                if (drawerCategory && menu) {
                                    router.push(`/menus/${menu.id}/categories/${drawerCategory.id}`);
                                    setDrawerOpen(false);
                                }
                            }}
                        >
                            <span>Ürünleri Görüntüle</span>
                        </Button>

                        <Button
                            size="lg"
                            variant="default"
                            icon={<Pencil className="h-4 w-4" />}
                            className="w-full justify-start"
                            onClick={() => {
                                setCategoryDialog({ open: true, category: drawerCategory });
                                setDrawerOpen(false);
                            }}
                        >
                            <span>Kategoriyi Düzenle</span>
                        </Button>

                        <Button
                            size="lg"
                            variant="default"
                            icon={<Trash2 className="h-4 w-4" />}
                            className="w-full justify-start text-red-500 border-red-500 hover:text-red-500 hover:border-red-500 bg-red-500/0 hover:bg-red-500/10 hover:ring-0"
                            onClick={() => {
                                setDeleteCategoryDialog({ open: true, category: drawerCategory });
                                setDrawerOpen(false);
                            }}
                        >
                            <span>Kategoriyi Sil</span>
                        </Button>
                    </div>
                </DrawerContent>
            </Drawer>
        </div>
    );
}
