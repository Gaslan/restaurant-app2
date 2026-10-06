'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Settings, Menu as MenuIcon, ChevronRight, Store, QrCode, Smartphone, Plus, LayoutList } from 'lucide-react';
import { cn } from '@/lib/utils';

import { authClient } from '@/lib/auth-client';

// Define types for navigation items
type NavigationItem = {
    title: string;
    icon: React.ElementType;
    href?: string; // href is optional for items with children
    children?: {
        title: string;
        href: string;
        icon: React.ElementType;
    }[];
};

const navigationItems: NavigationItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
        icon: Home,
    },
    {
        title: 'Menü Yönetimi',
        icon: MenuIcon,
        children: [
            {
                title: 'Menüler',
                href: '/menus',
                icon: MenuIcon,
            },
            {
                title: 'Menü 2',
                href: '/menu2',
                icon: LayoutList,
            },
            {
                title: 'Fiyat Editörü',
                href: '/price-editor',
                icon: Plus, // Using Plus as a temporary icon or similar
            }
        ]
    },
    {
        title: 'Ayarlar',
        icon: Settings,
        children: [
            {
                title: 'Restoran',
                href: '/settings/restaurant',
                icon: Store,
            },
            {
                title: 'QR Kod',
                href: '/settings/qr-code',
                icon: QrCode,
            },
            {
                title: 'QR Menü',
                href: '/settings/qr-menu',
                icon: Smartphone,
            },
        ],
    },
];

export function AdminSidebar() {
    const pathname = usePathname();
    const { data: session } = authClient.useSession();

    // Determine default open value based on current path
    const defaultOpen = navigationItems.find(item =>
        item.children?.some(child => pathname === child.href || pathname?.startsWith(child.href))
    )?.title;

    return (
        <div className="flex h-full flex-col gap-2">
            <div className="flex h-14 items-center border-b px-4 lg:h-15 lg:px-6">
                <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
                    <MenuIcon className="h-6 w-6" />
                    <span>Restoran Yönetim</span>
                </Link>
            </div>
            <div className="flex-1">
                <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
                    {navigationItems.map((item) => {
                        // If item has children, render Accordion
                        if (item.children) {
                            return (
                                <details
                                    key={item.title}
                                    open={defaultOpen === item.title}
                                    className="group w-full border-none"
                                >
                                    <summary className={cn(
                                        "flex cursor-pointer select-none items-center justify-between gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:text-primary hover:no-underline list-none",
                                        "[&::-webkit-details-marker]:hidden"
                                    )}>
                                        <div className="flex items-center gap-3">
                                            <item.icon className="h-4 w-4" />
                                            {item.title}
                                        </div>
                                        <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
                                    </summary>
                                    <div className="flex flex-col gap-1 pb-2 pl-10 pr-3 pt-1">
                                        {item.children.map((child) => {
                                            const isChildActive = pathname === child.href;
                                            return (
                                                <Link
                                                    key={child.href}
                                                    href={child.href}
                                                    className={cn(
                                                        'flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary',
                                                        isChildActive
                                                            ? 'bg-muted text-primary'
                                                            : 'text-muted-foreground'
                                                    )}
                                                >
                                                    <child.icon className="h-4 w-4" />
                                                    {child.title}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </details>
                            );
                        }

                        // Regular link item
                        const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href! + '/'));
                        return (
                            <Link
                                key={item.href}
                                href={item.href!}
                                className={cn(
                                    'flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary',
                                    isActive
                                        ? 'bg-muted text-primary'
                                        : 'text-muted-foreground'
                                )}
                            >
                                <item.icon className="h-4 w-4" />
                                {item.title}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* Sidebar Footer with User Info and Logout */}
            <div className="border-t p-4">
                <div className="flex items-center gap-3 mb-4 px-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                        {session?.user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-medium">{session?.user?.name || 'Kullanıcı'}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-30" title={session?.user?.email}>{session?.user?.email || ''}</span>
                    </div>
                </div>
                <button
                    onClick={() => authClient.signOut({ fetchOptions: { onSuccess: () => { window.location.href = '/login'; } } })}
                    className="w-full text-left px-4 py-2 text-sm font-medium text-muted-foreground hover:text-destructive transition-colors rounded-md hover:bg-muted"
                >
                    Güvenli Çıkış Yap
                </button>
            </div>
        </div>
    );
}
