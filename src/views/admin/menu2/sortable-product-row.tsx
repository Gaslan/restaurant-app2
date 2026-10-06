'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Pencil, Trash2, ChevronRight, GripVertical, ImageIcon } from 'lucide-react';
import type { Product } from '@/types';
import { Button, Badge, Checkbox } from '@/components/ui';
import Table from '@/components/ui/Table';
import classNames from '@/utils/classNames';

const formatPrice = (price: number, currency = 'TRY') => {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: currency,
    }).format(price);
};

interface SortableProductRowProps {
    product: Product;
    currency: string;
    isSelectionMode?: boolean;
    isSelected?: boolean;
    onToggleSelect?: (productId: string) => void;
    onDrawerOpen: (prod: Product) => void;
    onEdit: (prod: Product) => void;
    onDelete: (prod: Product) => void;
}

export function SortableProductRow({
    product,
    currency,
    isSelectionMode = false,
    isSelected = false,
    onToggleSelect,
    onDrawerOpen,
    onEdit,
    onDelete,
}: SortableProductRowProps) {
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
                'cursor-pointer md:cursor-default transition-colors hover:bg-gray-50/70 dark:hover:bg-gray-800/50',
                isDragging ? 'bg-gray-50 dark:bg-gray-800 z-10 relative' : '',
                isSelected ? 'bg-primary/5 dark:bg-primary/10' : ''
            )}
            onClick={(e) => {
                const target = e.target as HTMLElement;
                if (isSelectionMode) {
                    if (!target.closest('button')) {
                        onToggleSelect?.(product.id);
                    }
                    return;
                }
                if (window.innerWidth < 768 && !target.closest('button') && !target.closest('[data-drag-handle]')) {
                    e.preventDefault();
                    onDrawerOpen(product);
                }
            }}
        >
            {/* Drag handle or Checkbox */}
            <Table.Td className="w-10 p-3" onClick={(e) => e.stopPropagation()}>
                {isSelectionMode ? (
                    <div className="flex items-center justify-center">
                        <Checkbox
                            checked={isSelected}
                            onChange={() => onToggleSelect?.(product.id)}
                        />
                    </div>
                ) : (
                    <button
                        className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400 focus:outline-none"
                        style={{ touchAction: 'none' }}
                        data-drag-handle
                        {...attributes}
                        {...listeners}
                    >
                        <GripVertical className="h-4 w-4" />
                    </button>
                )}
            </Table.Td>

            {/* Thumbnail */}
            <Table.Td className="w-14 p-3">
                {product.imageUrl ? (
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 flex-shrink-0">
                        <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="object-cover w-full h-full"
                        />
                    </div>
                ) : (
                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center border border-gray-200 dark:border-gray-700 flex-shrink-0">
                        <ImageIcon className="w-5 h-5 text-gray-400" />
                    </div>
                )}
            </Table.Td>

            {/* Name & Description */}
            <Table.Td className="p-3">
                <div className="font-semibold text-sm heading-text">{product.name}</div>
                {product.description && (
                    <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {product.description}
                    </div>
                )}
            </Table.Td>

            {/* Price */}
            <Table.Td className="p-3 whitespace-nowrap text-sm font-medium text-gray-700 dark:text-gray-300">
                {formatPrice(product.price, currency)}
            </Table.Td>

            {/* Availability */}
            <Table.Td className="hidden md:table-cell p-3 whitespace-nowrap">
                <Badge
                    className={classNames(
                        'border text-xs',
                        product.available ? 'border-green-500' : 'border-gray-400'
                    )}
                    content={product.available ? 'Müsait' : 'Tükendi'}
                    innerClass={classNames(
                        'bg-white dark:bg-gray-900',
                        product.available ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
                    )}
                />
            </Table.Td>

            {/* Actions */}
            <Table.Td className="text-right p-3 whitespace-nowrap">
                {/* Desktop: Show inline action buttons */}
                <div
                    className="hidden md:flex gap-1.5 justify-end items-center"
                    onClick={(e) => e.stopPropagation()}
                >
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
