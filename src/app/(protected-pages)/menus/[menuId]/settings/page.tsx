import { Suspense } from 'react';
import type { Metadata } from 'next';
import { MenuSettingsView } from '@/views/admin/menus/menu-settings-view';
import { Loader2 } from 'lucide-react';

export const metadata: Metadata = {
    title: 'Menü Görünüm Ayarları',
    description: 'Menüye özel görünüm ve yerleşim ayarlarını düzenleyin.',
};

export default async function MenuSettingsPage({
    params,
}: {
    params: Promise<{ menuId: string }>;
}) {
    const { menuId } = await params;

    return (
        <div className="w-full px-4 sm:px-0">
            <Suspense
                fallback={
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                }
            >
                <MenuSettingsView menuId={menuId} />
            </Suspense>
        </div>
    );
}
