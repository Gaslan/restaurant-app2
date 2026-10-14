import { Suspense } from 'react';
import { Menu2View } from '@/views/admin/menu2/menu2-view';
import { Loader2 } from 'lucide-react';

export default async function MenuBulkPage({
    params,
}: {
    params: Promise<{ menuId: string }>;
}) {
    const { menuId } = await params;

    return (
        <div className="w-full">
            <Suspense
                fallback={
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                }
            >
                <Menu2View targetMenuId={menuId} />
            </Suspense>
        </div>
    );
}
