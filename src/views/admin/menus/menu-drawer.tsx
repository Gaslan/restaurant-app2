'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';

import { menuSchema } from '@/lib/validations';
import { z } from 'zod';
import type { Menu } from '@/types';
import { Button, Drawer, Input } from '@/components/ui';
import { FormContainer, FormItem } from '@/components/ui/Form';
import { Controller } from 'react-hook-form';

type MenuFormData = z.infer<typeof menuSchema>;

interface MenuDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (data: MenuFormData) => Promise<void>;
    menu?: Menu; // If provided, we're editing
}

export function MenuDrawer({ open, onOpenChange, onSave, menu }: MenuDrawerProps) {
    const [isSaving, setIsSaving] = useState(false);

    const form = useForm<MenuFormData>({
        resolver: zodResolver(menuSchema),
        defaultValues: {
            name: '',
            isActive: true,
        },
    });

    // Reset form when menu changes
    useEffect(() => {
        if (menu) {
            form.reset({
                name: menu.name,
                isActive: menu.isActive ?? true,
            });
        } else {
            form.reset({
                name: '',
                isActive: true, // Default to active for new menus
            });
        }
    }, [menu, form]);

    async function onSubmit(data: MenuFormData) {
        setIsSaving(true);
        try {
            await onSave(data);
            form.reset();
            onOpenChange(false);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    }

    const Footer = (
        <div className='bg-background mt-auto flex justify-end space-x-2 w-full'>
            <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
            >
                İptal
            </Button>
            <Button
                type="submit"
                form="menu-form"
                variant='solid'
                size="sm"
                loading={isSaving}
            >
                {menu
                    ? 'Değişiklikleri Kaydet'
                    : 'Menü Oluştur'
                }
            </Button>
        </div>
    )

    const Title = (
        <div className='flex flex-col gap-1.5'>
            <h2 className='text-foreground font-semibold text-lg'>{menu ? 'Menüyü Düzenle' : 'Yeni Menü Oluştur'}</h2>
            <div className='text-muted-foreground text-sm'>
                {menu
                    ? 'Menü bilgilerini güncelleyin.'
                    : 'Restoranınız için yeni bir menü oluşturun.'
                }
            </div>
        </div>
    )

    return (
        <Drawer
            placement='right'
            title={Title}
            isOpen={open}
            footer={Footer}
            onClose={() => onOpenChange(false)}
            onRequestClose={() => onOpenChange(false)}
        >
            <div className="flex-1 overflow-y-auto p-0.5">
                <FormContainer>
                    <form id="menu-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <Controller
                            control={form.control}
                            name="name"
                            render={({ field, fieldState }) => (
                                <FormItem
                                    label="Menü Adı"
                                    invalid={Boolean(fieldState.error)}
                                    errorMessage={fieldState.error?.message}
                                >
                                    <Input
                                        placeholder="Örn: Öğle Menüsü"
                                        {...field}
                                    />
                                </FormItem>
                            )}
                        />
                    </form>
                </FormContainer>
            </div>
        </Drawer>

        // <Sheet open={open} onOpenChange={onOpenChange}>
        //     <SheetContent className="flex flex-col h-full w-full sm:max-w-md p-0 gap-0">
        //         <SheetHeader className="px-6 py-4 border-b">
        //             <SheetTitle>{menu ? 'Menüyü Düzenle' : 'Yeni Menü Oluştur'}</SheetTitle>
        //             <SheetDescription>
        //                 {menu
        //                     ? 'Menü bilgilerini güncelleyin.'
        //                     : 'Restoranınız için yeni bir menü oluşturun.'}
        //             </SheetDescription>
        //         </SheetHeader>

        //         <div className="flex-1 overflow-y-auto py-6 px-6">
        //             <Form {...form}>
        //                 <form id="menu-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        //                     <FormField
        //                         control={form.control}
        //                         name="name"
        //                         render={({ field }) => (
        //                             <FormItem>
        //                                 <FormLabel>Menü Adı</FormLabel>
        //                                 <FormControl>
        //                                     <Input
        //                                         placeholder="Örn: Öğle Menüsü"
        //                                         {...field}
        //                                     />
        //                                 </FormControl>
        //                                 <FormMessage />
        //                             </FormItem>
        //                         )}
        //                     />
        //                 </form>
        //             </Form>
        //         </div>

        //         <SheetFooter className="px-6 py-4 border-t bg-background mt-auto flex-row justify-end space-x-2">
        //             <Button
        //                 type="button"
        //                 variant="default"
        //                 onClick={() => onOpenChange(false)}
        //                 disabled={isSaving}
        //             >
        //                 İptal
        //             </Button>
        //             <Button
        //                 type="submit"
        //                 form="menu-form"
        //                 disabled={isSaving}
        //             >
        //                 {isSaving ? (
        //                     <>
        //                         <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        //                         Kaydediliyor...
        //                     </>
        //                 ) : menu ? (
        //                     'Değişiklikleri Kaydet'
        //                 ) : (
        //                     'Menü Oluştur'
        //                 )}
        //             </Button>
        //         </SheetFooter>
        //     </SheetContent>
        // </Sheet>
    );
}



