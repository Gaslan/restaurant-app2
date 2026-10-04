'use client';

import { Button, Dialog } from "@/components/ui";


interface DeleteMenuDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => Promise<void>;
    menuName: string;
}

export function DeleteMenuDialog({
    open,
    onOpenChange,
    onConfirm,
    menuName,
}: DeleteMenuDialogProps) {
    return (

        <Dialog
                isOpen={open}
                onClose={() => onOpenChange(false)}
                onRequestClose={() => onOpenChange(false)}
            >
                <h5 className="mb-4">Are you sure?</h5>
                <p>
                    This will permanently delete the menu <strong>"{menuName}"</strong>{' '}
                         and all its categories and products. This action cannot be undone.
                </p>
                <div className="text-right mt-6">
                    <Button
                        className="ltr:mr-2 rtl:ml-2"
                        variant="plain"
                        onClick={() => onOpenChange(false)}
                    >
                        İptal
                    </Button>
                    <Button variant="solid" onClick={onConfirm} className="bg-red-700 hover:bg-red-800 text-white">
                        Sil
                    </Button>
                </div>
            </Dialog>
        // <AlertDialog open={open} onOpenChange={onOpenChange}>
        //     <AlertDialogContent>
        //         <AlertDialogHeader>
        //             <AlertDialogTitle>Are you sure?</AlertDialogTitle>
        //             <AlertDialogDescription>
        //                 This will permanently delete the menu <strong>"{menuName}"</strong>{' '}
        //                 and all its categories and products. This action cannot be undone.
        //             </AlertDialogDescription>
        //         </AlertDialogHeader>
        //         <AlertDialogFooter>
        //             <AlertDialogCancel>Cancel</AlertDialogCancel>
        //             <AlertDialogAction onClick={onConfirm} className="bg-red-700 hover:bg-red-800 text-white">
        //                 Delete Menu
        //             </AlertDialogAction>
        //         </AlertDialogFooter>
        //     </AlertDialogContent>
        // </AlertDialog>
    );
}
