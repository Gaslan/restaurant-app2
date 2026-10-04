'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Loader2, ChevronRight, Eye, Smartphone } from 'lucide-react';

import {
    Table,
} from '@/components/ui/Table';

import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';
import type { Menu } from '@/types';
import type { MenuFormData } from '@/lib/validations';
// import { MenuDrawer } from '@/components/admin/menus/menu-drawer';
import { DeleteMenuDialog } from '@/views/admin/menus/delete-menu-dialog';
import { Badge, Button, Switcher } from '@/components/ui';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/vaul-drawer';
import Container from '@/components/shared/Container';
import AdaptiveCard from '@/components/shared/AdaptiveCard';
import classNames from '@/utils/classNames';
import { MenuDrawer } from '@/views/admin/menus/menu-drawer';


export default function MenusPage() {
    const router = useRouter();
    const [menus, setMenus] = useState<Menu[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedMenu, setSelectedMenu] = useState<Menu | undefined>();
    const [menuToDelete, setMenuToDelete] = useState<Menu | undefined>();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerMenu, setDrawerMenu] = useState<Menu | undefined>();


    // Fetch menus
    useEffect(() => {
        fetchMenus();
    }, []);

    async function fetchMenus() {
        try {
            const response = await apiGet<Menu[]>('/api/menus');
            setMenus(response.data);
        } catch (error) {
            toast.error('Failed to load menus');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleSaveMenu(data: MenuFormData) {
        try {
            if (selectedMenu) {
                // Update existing menu
                await apiPatch<Menu>(`/api/menus/${selectedMenu.id}`, data);
                toast.success('Menu updated successfully');
            } else {
                // Create new menu
                await apiPost<Menu>('/api/menus', data);
                toast.success('Menu created successfully');
            }
            await fetchMenus();
        } catch (error) {
            toast.error(selectedMenu ? 'Failed to update menu' : 'Failed to create menu');
            throw error;
        }
    }

    async function handleDeleteMenu() {
        if (!menuToDelete) return;

        try {
            await apiDelete(`/api/menus/${menuToDelete.id}`);
            toast.success('Menu deleted successfully');
            await fetchMenus();
            setDeleteDialogOpen(false);
        } catch (error) {
            toast.error('Failed to delete menu');
            console.error(error);
        }
    }

    function openCreateDialog() {
        setSelectedMenu(undefined);
        setDialogOpen(true);
    }

    function openEditDialog(menu: Menu) {
        setSelectedMenu(menu);
        setDialogOpen(true);
    }

    function openDeleteDialog(menu: Menu) {
        setMenuToDelete(menu);
        setDeleteDialogOpen(true);
    }

    async function handleToggleActive(menu: Menu, checked: boolean) {
        // Optimistically update drawer if it's the same menu
        if (drawerMenu?.id === menu.id) {
            setDrawerMenu({ ...menu, isActive: checked });
        }

        // Optimistically update the menu list
        setMenus(currentMenus =>
            currentMenus.map(m =>
                m.id === menu.id ? { ...m, isActive: checked } : m
            )
        );

        try {
            await apiPatch<Menu>(`/api/menus/${menu.id}`, {
                isActive: checked,
            });
            toast.success(checked ? 'Menu activated' : 'Menu deactivated');
            // No need to fetchMenus() since we updated optimistically
            // await fetchMenus(); 
        } catch (error) {
            // Revert drawer state on error
            if (drawerMenu?.id === menu.id) {
                setDrawerMenu({ ...menu, isActive: !checked });
            }

            // Revert menu list state on error
            setMenus(currentMenus =>
                currentMenus.map(m =>
                    m.id === menu.id ? { ...m, isActive: !checked } : m
                )
            );

            toast.error('Failed to update menu status');
            console.error(error);
        }
    }

    function openDrawer(menu: Menu) {
        setDrawerMenu(menu);
        setDrawerOpen(true);
    }

    function handleViewDetails() {
        if (drawerMenu) {
            setDrawerOpen(false);
            router.push(`/menus/${drawerMenu.id}`);
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Menus</h1>
                    <p className="text-muted-foreground">
                        Manage your restaurant's menus and their visibility
                    </p>
                </div>
                <Button variant='solid' size='sm' onClick={openCreateDialog} icon={<Plus className="h-4 w-4" />} className="w-full md:w-auto rounded-full">
                    <span>Create Menu</span>
                </Button>
            </div>

            {menus.length === 0 ? (
                <div className="text-center py-12 border rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">No menus yet</h3>
                    <p className="text-muted-foreground mb-4">
                        Get started by creating your first menu
                    </p>
                    <Button onClick={openCreateDialog} icon={<Plus className="h-4 w-4" />} className="w-full md:w-auto rounded-full">
                        <span>Create Menu</span>
                    </Button>
                </div>
            ) : (
                <div className="border-0 rounded-lg">
                    <AdaptiveCard>

                        <Table>
                            <Table.THead>
                                <Table.Tr>
                                    <Table.Th className="p-4">Name</Table.Th>
                                    <Table.Th className="p-4">Status</Table.Th>
                                    <Table.Th className="text-right p-4"></Table.Th>
                                </Table.Tr>
                            </Table.THead>
                            <Table.TBody>
                                {menus.map((menu) => (
                                    <Table.Tr
                                        key={menu.id}
                                        className="cursor-pointer md:cursor-default"
                                        onClick={(e) => {
                                            // On mobile, open drawer; on desktop, navigate
                                            const target = e.target as HTMLElement;
                                            if (window.innerWidth < 768 && !target.closest('button')) {
                                                e.preventDefault();
                                                openDrawer(menu);
                                            } else if (window.innerWidth >= 768 && !target.closest('button, [role="switch"]')) {
                                                router.push(`/menus/${menu.id}`);
                                            }
                                        }}
                                    >
                                        <Table.Td className="font-semibold heading-text p-4">{menu.name}</Table.Td>
                                        <Table.Td className="p-4">
                                            <Badge
                                                className={classNames('mr-4 border border-gray-400', menu.isActive ? 'border-green-500' : 'border-gray-400')}
                                                content={menu.isActive ? 'Active' : 'Inactive'}
                                                innerClass={classNames('bg-white text-gray-500', menu.isActive ? 'text-green-500' : 'text-gray-400')} />
                                        </Table.Td>
                                        <Table.Td className="text-right p-4">
                                            {/* Desktop: Show full controls */}
                                            <div className="hidden md:flex gap-2 justify-end items-center" onClick={(e) => e.stopPropagation()}>
                                                <Switcher
                                                    checked={menu.isActive}
                                                    onChange={(checked: boolean) => handleToggleActive(menu, checked)}
                                                    aria-label="Toggle menu active status"
                                                />

                                                <Button
                                                    size="xs"
                                                    icon={<Pencil className="h-3.5 w-3.5" />}
                                                    onClick={() => openEditDialog(menu)}
                                                >

                                                    Edit
                                                </Button>
                                                <Button
                                                    size="xs"
                                                    icon={<Trash2 className="h-3.5 w-3.5" />}
                                                    onClick={() => openDeleteDialog(menu)}
                                                >
                                                    Delete
                                                </Button>
                                            </div>
                                            {/* Mobile: Show chevron */}
                                            <div className="md:hidden flex justify-end">
                                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                            </div>
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.TBody>
                        </Table>
                    </AdaptiveCard>
                </div>
            )}

            <MenuDrawer
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSave={handleSaveMenu}
                menu={selectedMenu}
            />

            {menuToDelete && (
                <DeleteMenuDialog
                    open={deleteDialogOpen}
                    onOpenChange={setDeleteDialogOpen}
                    onConfirm={handleDeleteMenu}
                    menuName={menuToDelete.name}
                />
            )}

            {/* Mobile Drawer for Menu Actions */}
            <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
                <DrawerContent className="bg-neutral">
                    <DrawerHeader>
                        <DrawerTitle>{drawerMenu?.name}</DrawerTitle>
                        <DrawerDescription>
                            Choose an action for this menu
                        </DrawerDescription>
                    </DrawerHeader>
                    <div className="px-4 pb-4 space-y-3">

                        {/* Toggle Active */}
                        <div className="flex items-center justify-between py-3 px-1 border-0 rounded-md">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">Menu is active</span>
                                {/* <Badge className='bg-green-600 text-white' variant={drawerMenu?.isActive ? 'default' : 'secondary'}>
                                    {drawerMenu?.isActive ? 'Active' : 'Inactive'}
                                </Badge> */}
                            </div>
                            <Switcher
                                checked={drawerMenu?.isActive ?? false}
                                onChange={(checked: boolean) => {
                                    if (drawerMenu) {
                                        handleToggleActive(drawerMenu, checked);
                                    }
                                }}
                            />
                        </div>

                        {/* View Details */}
                        <Button
                            size={'lg'}
                            variant="default"
                            icon={<Eye className="h-4 w-4" />}
                            className="w-full justify-start"
                            onClick={handleViewDetails}
                        >
                            <span>View Details</span>
                        </Button>



                        {/* Edit Button */}
                        <Button
                            size={'lg'}
                            variant="default"
                            icon={<Pencil className="h-4 w-4" />}
                            className="w-full justify-start"
                            onClick={() => {
                                if (drawerMenu) {
                                    openEditDialog(drawerMenu);
                                    setDrawerOpen(false);
                                }
                            }}
                        >
                            <span>Edit Menu</span>
                        </Button>

                        {/* Delete Button */}
                        <Button
                            size={'lg'}
                            variant="default"
                            icon={<Trash2 className="h-4 w-4" />}
                            className="w-full justify-start text-red-500 border-red-500 hover:text-red-500 hover:border-red-500 bg-red-500/0 hover:bg-red-500/10 hover:ring-0"
                            onClick={() => {
                                if (drawerMenu) {
                                    openDeleteDialog(drawerMenu);
                                    setDrawerOpen(false);
                                }
                            }}
                        >
                            <span>Delete Menu</span>
                        </Button>
                    </div>
                </DrawerContent>
            </Drawer>


        </div>
    );
}
