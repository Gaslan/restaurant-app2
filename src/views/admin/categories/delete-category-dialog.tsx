import { Button, Dialog } from '@/components/ui';

interface DeleteCategoryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    categoryName: string;
}

export function DeleteCategoryDialog({
    open,
    onOpenChange,
    onConfirm,
    categoryName,
}: DeleteCategoryDialogProps) {
    return (
        <Dialog
            isOpen={open}
            onClose={() => onOpenChange(false)}
            onRequestClose={() => onOpenChange(false)}
        >
            <h5 className="mb-4">Kategori Silinecek</h5>
            <p>
                <strong>{categoryName}</strong> kategorisini silmek istediğinizden emin misiniz?
                <br />
                <br />
                Bu kategorideki <strong>tüm ürünler de silinecektir</strong>. Bu işlem geri
                alınamaz.
            </p>
            <div className="text-right mt-6">
                <Button
                    className="ltr:mr-2 rtl:ml-2"
                    variant="plain"
                    onClick={() => onOpenChange(false)}
                >
                    İptal
                </Button>
                <Button variant="solid" onClick={onConfirm}>
                    Sil
                </Button>
            </div>
        </Dialog>
    );
}
