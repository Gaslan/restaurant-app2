'use client';

import { Menu, LogOut, User } from 'lucide-react';
import { Button, Drawer, Avatar, Dropdown } from '@/components/ui';
import { AdminSidebar } from './sidebar';
import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useState } from 'react';

export function AdminHeader() {
    const { data: session } = authClient.useSession();
    const router = useRouter();
    const [drawerOpen, setDrawerOpen] = useState(false);

    const handleSignOut = async () => {
        try {
            await authClient.signOut({
                fetchOptions: {
                    onSuccess: () => {
                        toast.success('Başarıyla çıkış yapıldı');
                        router.push('/sign-in');
                        router.refresh();
                    },
                    onError: (ctx) => {
                        toast.error(ctx.error.message || 'Çıkış yapılırken bir hata oluştu');
                    }
                },
            });
        } catch (error) {
            console.error('Sign out error:', error);
            toast.error('Çıkış yapılırken bir hata oluştu');
        }
    };

    const userInitial = session?.user?.name?.charAt(0).toUpperCase() || 'U';

    const ToggleButton = (
        <Button variant="default" size="sm" className="rounded-full hidden sm:flex px-2 py-1 items-center justify-center">
            <Avatar size={24} src={session?.user?.image || ''} icon={<User className="h-4 w-4" />} shape="circle">
                {userInitial}
            </Avatar>
        </Button>
    )

    return (
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
            <Button variant="plain" size="sm" className="relative group shrink-0 md:hidden" onClick={() => setDrawerOpen(true)}>
                <Menu className="h-5 w-5" />
                <span className="sr-only">Menüyü aç/kapat</span>
            </Button>

            <Drawer
                placement="left"
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                onRequestClose={() => setDrawerOpen(false)}
                closable={false}
                bodyClass="p-0"
                width={250}
            >
                <AdminSidebar />
            </Drawer>

            <div className="w-full flex-1">
            </div>



            <Dropdown renderTitle={ToggleButton} placement="bottom-end">
                <Dropdown.Item onClick={() => { }} className="gap-2 cursor-pointer flex items-center">
                    <User className="h-4 w-4" />
                    <span>Profil</span>
                </Dropdown.Item>
                <Dropdown.Item variant="divider" />
                <Dropdown.Item onClick={handleSignOut} className="gap-2 cursor-pointer text-destructive flex items-center">
                    <LogOut className="h-4 w-4" />
                    <span>Çıkış Yap</span>
                </Dropdown.Item>
            </Dropdown>
        </header>
    );
}
