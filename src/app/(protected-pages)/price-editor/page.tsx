import { Suspense } from 'react';
import { PriceEditorView } from '@/views/admin/price-editor/price-editor-view';
import { Loader2 } from 'lucide-react';

export default function PriceEditorPage() {
    return (
        <div className="w-full">
            <Suspense
                fallback={
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                }
            >
                <PriceEditorView />
            </Suspense>
        </div>
    );
}
