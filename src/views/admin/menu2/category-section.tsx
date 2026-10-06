'use client';

import { useState } from 'react';
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
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
    Pencil,
    Trash2,
    Plus,
    ChevronDown,
    ChevronUp,
    ImageIcon,
    ArrowUp,
    ArrowDown,
    MoreVertical,
} from 'lucide-react';
import type { CategoryWithProducts, Product } from '@/types';
import { Button, Badge, Dropdown, Checkbox } from '@/components/ui';
import Table from '@/components/ui/Table';
import AdaptiveCard from '@/components/shared/AdaptiveCard';
import classNames from '@/utils/classNames';
import { SortableProductRow } from './sortable-product-row';

interface CategorySectionProps {
    category: CategoryWithProducts;
    currency: string;
    isFirst: boolean;
    isLast: boolean;
    searchQuery: string;
    statusFilter: string;
    isSelectionMode?: boolean;
    selectedProductIds?: string[];
    onToggleSelectProduct?: (productId: string) => void;
    onSelectCategoryProducts?: (
        categoryId: string,
        productIds: string[],
        selectAll: boolean
    ) => void;
    onAddProduct: (categoryId: string) => void;
    onAddCategoryAfter: (categoryId: string) => void;
    onEditCategory: (category: CategoryWithProducts) => void;
    onDeleteCategory: (category: CategoryWithProducts) => void;
    onMoveCategory: (categoryId: string, direction: 'up' | 'down') => void;
    onEditProduct: (product: Product, categoryId: string) => void;
    onDeleteProduct: (product: Product, categoryId: string) => void;
    onProductDrawerOpen: (product: Product, categoryId: string) => void;
    onReorderProducts: (
        categoryId: string,
        oldIndex: number,
        newIndex: number,
        activeId: string
    ) => Promise<void>;
}

export function CategorySection({
    category,
    currency,
    isFirst,
    isLast,
    searchQuery,
    statusFilter,
    isSelectionMode = false,
    selectedProductIds = [],
    onToggleSelectProduct,
    onSelectCategoryProducts,
    onAddProduct,
    onAddCategoryAfter,
    onEditCategory,
    onDeleteCategory,
    onMoveCategory,
    onEditProduct,
    onDeleteProduct,
    onProductDrawerOpen,
    onReorderProducts,
}: CategorySectionProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    // Filter products inside this category
    const filteredProducts = (category.products || []).filter((product) => {
        const matchesSearch =
            searchQuery === '' ||
            product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (product.description &&
                product.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
            category.name.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'available' && product.available) ||
            (statusFilter === 'unavailable' && !product.available);

        return matchesSearch && matchesStatus;
    });

    // Drag-and-drop sensors for products within this category
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleProductDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = filteredProducts.findIndex((p) => p.id === active.id);
        const newIndex = filteredProducts.findIndex((p) => p.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        await onReorderProducts(category.id, oldIndex, newIndex, String(active.id));
    };

    // If there's an active search query and no matching products AND category doesn't match, hide section
    const categoryMatchesQuery =
        searchQuery === '' ||
        category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (category.description &&
            category.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const categoryProductIds = (category.products || []).map((p) => p.id);
    const isAllSelected =
        categoryProductIds.length > 0 &&
        categoryProductIds.every((id) => selectedProductIds.includes(id));
    const isSomeSelected =
        categoryProductIds.some((id) => selectedProductIds.includes(id));

    if (searchQuery !== '' && filteredProducts.length === 0 && !categoryMatchesQuery) {
        return null;
    }

    return (
        <div className="w-full rounded-none sm:rounded-xl border-y sm:border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden transition-all">
            {/* Category Header (Single row) */}
            <div
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center justify-between gap-3 p-3 sm:px-4 sm:py-3.5 bg-gray-50/70 dark:bg-gray-800/40 border-b border-gray-200/80 dark:border-gray-800 cursor-pointer select-none hover:bg-gray-100/60 dark:hover:bg-gray-800/70 transition-colors"
            >
                {/* Left: Checkbox (in selection mode), Image, Name, Badge, Description in single row */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Category Selection Checkbox */}
                    {isSelectionMode && (
                        <div
                            className="flex items-center justify-center flex-shrink-0"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Checkbox
                                checked={isAllSelected}
                                indeterminate={isSomeSelected && !isAllSelected}
                                disabled={categoryProductIds.length === 0}
                                onChange={(checked) => {
                                    onSelectCategoryProducts?.(
                                        category.id,
                                        categoryProductIds,
                                        checked
                                    );
                                }}
                            />
                        </div>
                    )}

                    {/* Category Image */}
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center">
                        {category.imageUrl ? (
                            <img
                                src={category.imageUrl}
                                alt={category.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <ImageIcon className="w-4 h-4 text-gray-400" />
                        )}
                    </div>

                    {/* Category Title, Badge & Optional Description in single line */}
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                        <h3 className="font-semibold text-sm sm:text-base heading-text truncate">
                            {category.name}
                        </h3>
                        <Badge
                            content={`${category.products?.length || 0} Ürün`}
                            className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-normal text-muted-foreground whitespace-nowrap flex-shrink-0"
                        />
                        {category.description && (
                            <span className="hidden md:inline text-xs text-muted-foreground truncate max-w-sm">
                                — {category.description}
                            </span>
                        )}
                    </div>
                </div>

                {/* Right: Dropdown & Chevron */}
                <div
                    className="flex items-center gap-1 flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                >
                    <Dropdown
                        placement="bottom-end"
                        renderTitle={
                            <button
                                type="button"
                                className="p-1.5 rounded-lg hover:bg-gray-200/70 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 transition-colors flex items-center justify-center"
                                title="Kategori İşlemleri"
                            >
                                <MoreVertical className="h-4 w-4" />
                            </button>
                        }
                    >
                        <Dropdown.Item
                            eventKey="move-up"
                            disabled={isFirst}
                            onClick={() => !isFirst && onMoveCategory(category.id, 'up')}
                            className={`flex items-center gap-2 ${
                                isFirst ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                            }`}
                        >
                            <ArrowUp className="h-4 w-4 text-gray-500" />
                            <span>Yukarı Taşı</span>
                        </Dropdown.Item>

                        <Dropdown.Item
                            eventKey="move-down"
                            disabled={isLast}
                            onClick={() => !isLast && onMoveCategory(category.id, 'down')}
                            className={`flex items-center gap-2 ${
                                isLast ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                            }`}
                        >
                            <ArrowDown className="h-4 w-4 text-gray-500" />
                            <span>Aşağı Taşı</span>
                        </Dropdown.Item>

                        <Dropdown.Item
                            eventKey="edit"
                            onClick={() => onEditCategory(category)}
                            className="flex items-center gap-2 cursor-pointer"
                        >
                            <Pencil className="h-4 w-4 text-gray-500" />
                            <span>Düzenle</span>
                        </Dropdown.Item>

                        <Dropdown.Item variant="divider" />

                        <Dropdown.Item
                            eventKey="delete"
                            onClick={() => onDeleteCategory(category)}
                            className="flex items-center gap-2 cursor-pointer text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                        >
                            <Trash2 className="h-4 w-4 text-red-500" />
                            <span>Sil</span>
                        </Dropdown.Item>
                    </Dropdown>

                    {/* Expand/Collapse Toggle */}
                    <button
                        type="button"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="p-1.5 rounded-lg hover:bg-gray-200/70 dark:hover:bg-gray-700 text-gray-500 transition-colors flex items-center justify-center"
                        title={isExpanded ? 'Daralt' : 'Genişlet'}
                    >
                        {isExpanded ? (
                            <ChevronUp className="h-5 w-5" />
                        ) : (
                            <ChevronDown className="h-5 w-5" />
                        )}
                    </button>
                </div>
            </div>

            {/* Category Body / Products List */}
            {isExpanded && (
                <div>
                    {filteredProducts.length === 0 ? (
                        <div className="text-center py-8 px-4 bg-gray-50/30 dark:bg-gray-900/40">
                            {category.products?.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    Bu kategoride henüz ürün bulunmuyor.
                                </p>
                            ) : (
                                <p className="text-xs text-muted-foreground">
                                    Filtrelere uygun ürün bulunamadı.
                                </p>
                            )}
                        </div>
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleProductDragEnd}
                        >
                            <Table>
                                {/* <Table.THead>
                                    <Table.Tr className="bg-gray-50/40 dark:bg-gray-800/20 text-xs">
                                        <Table.Th className="w-10 p-3"></Table.Th>
                                        <Table.Th className="w-14 p-3">Görsel</Table.Th>
                                        <Table.Th className="p-3">Ürün Adı</Table.Th>
                                        <Table.Th className="p-3">Fiyat</Table.Th>
                                        <Table.Th className="hidden md:table-cell p-3">Durum</Table.Th>
                                        <Table.Th className="text-right p-3"></Table.Th>
                                    </Table.Tr>
                                </Table.THead> */}
                                <SortableContext
                                    items={filteredProducts.map((p) => p.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <Table.TBody>
                                        {filteredProducts.map((product) => (
                                            <SortableProductRow
                                                key={product.id}
                                                product={product}
                                                currency={currency}
                                                isSelectionMode={isSelectionMode}
                                                isSelected={selectedProductIds.includes(product.id)}
                                                onToggleSelect={onToggleSelectProduct}
                                                onDrawerOpen={(p) => onProductDrawerOpen(p, category.id)}
                                                onEdit={(p) => onEditProduct(p, category.id)}
                                                onDelete={(p) => onDeleteProduct(p, category.id)}
                                            />
                                        ))}
                                    </Table.TBody>
                                </SortableContext>
                            </Table>
                        </DndContext>
                    )}

                    {/* Category Bottom Actions: Ürün Ekle & Kategori Ekle */}
                    <div className="flex flex-row items-center justify-start gap-2 p-3 sm:p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20">
                        <Button
                            size="xs"
                            variant="solid"
                            icon={<Plus className="h-4 w-4" />}
                            onClick={() => onAddProduct(category.id)}
                            className="flex-1 sm:flex-none sm:w-auto justify-center"
                        >
                            <span>Ürün Ekle</span>
                        </Button>
                        <Button
                            size="xs"
                            variant="default"
                            icon={<Plus className="h-4 w-4" />}
                            onClick={() => onAddCategoryAfter(category.id)}
                            className="flex-1 sm:flex-none sm:w-auto justify-center"
                        >
                            <span>Kategori Ekle</span>
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
