import ConfirmDialog from '@/components/shared/ConfirmDialog';

interface DeleteProductDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    productName: string;
}

export function DeleteProductDialog({
    open,
    onOpenChange,
    onConfirm,
    productName,
}: DeleteProductDialogProps) {
    return (
        <ConfirmDialog
            isOpen={open}
            onClose={() => onOpenChange(false)}
            onRequestClose={() => onOpenChange(false)}
            onCancel={() => onOpenChange(false)}
            onConfirm={onConfirm}
            type="danger"
            title="Ürün Silinecek"
            confirmText="Sil"
            cancelText="İptal"
            confirmButtonProps={{ className: "bg-destructive text-destructive-foreground hover:bg-destructive/90" }}
        >
            <p className="mt-2 text-muted-foreground">
                <strong>{productName}</strong> ürününü silmek istediğinizden emin misiniz?
                <br />
                <br />
                Bu işlem geri alınamaz.
            </p>
        </ConfirmDialog>
    );
}
