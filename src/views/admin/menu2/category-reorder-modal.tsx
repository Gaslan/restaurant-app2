'use client';

import { useState, useEffect } from 'react';
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
import { Dialog, Button } from '@/components/ui';
import { GripVertical, ImageIcon } from 'lucide-react';
import type { CategoryWithProducts } from '@/types';
import classNames from '@/utils/classNames';

interface CategoryReorderModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    categories: CategoryWithProducts[];
    onReorder: (oldIndex: number, newIndex: number, activeId: string) => Promise<void>;
}

function SortableItem({ category }: { category: CategoryWithProducts }) {
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
        opacity: isDragging ? 0.6 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={classNames(
                'flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg select-none',
                isDragging ? 'shadow-lg border-primary z-20 relative' : ''
            )}
        >
            <button
                className="cursor-grab active:cursor-grabbing p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded focus:outline-none"
                style={{ touchAction: 'none' }}
                {...attributes}
                {...listeners}
            >
                <GripVertical className="h-5 w-5" />
            </button>

            <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                {category.imageUrl ? (
                    <img
                        src={category.imageUrl}
                        alt={category.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <ImageIcon className="w-5 h-5 text-gray-400" />
                )}
            </div>

            <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{category.name}</div>
                <div className="text-xs text-muted-foreground">
                    {category.products?.length || 0} ürün
                </div>
            </div>
        </div>
    );
}

export function CategoryReorderModal({
    open,
    onOpenChange,
    categories,
    onReorder,
}: CategoryReorderModalProps) {
    const [items, setItems] = useState<CategoryWithProducts[]>(categories);

    useEffect(() => {
        setItems(categories);
    }, [categories]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = items.findIndex((c) => c.id === active.id);
        const newIndex = items.findIndex((c) => c.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return;

        const reordered = [...items];
        const [moved] = reordered.splice(oldIndex, 1);
        reordered.splice(newIndex, 0, moved);
        setItems(reordered);

        await onReorder(oldIndex, newIndex, String(active.id));
    };

    return (
        <Dialog
            isOpen={open}
            onClose={() => onOpenChange(false)}
            onRequestClose={() => onOpenChange(false)}
            width={480}
        >
            <div className="space-y-4">
                <div>
                    <h5 className="font-bold text-lg">Kategorileri Sırala</h5>
                    <p className="text-xs text-muted-foreground mt-1">
                        Kategorilerin yerini değiştirmek için tutup sürükleyin.
                    </p>
                </div>

                <div className="max-h-[60vh] overflow-y-auto space-y-2 pr-1">
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={items.map((c) => c.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {items.map((cat) => (
                                <SortableItem key={cat.id} category={cat} />
                            ))}
                        </SortableContext>
                    </DndContext>
                </div>

                <div className="flex justify-end pt-2">
                    <Button variant="solid" onClick={() => onOpenChange(false)}>
                        Tamam
                    </Button>
                </div>
            </div>
        </Dialog>
    );
}
