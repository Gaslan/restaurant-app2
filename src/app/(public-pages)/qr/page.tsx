import React from 'react';
import type { Metadata } from 'next';
import { QrCode, ScanLine } from 'lucide-react';

export const metadata: Metadata = {
    title: 'QR Menü | Menüyü Görüntüleyin',
    description: 'Restoran menüsünü görüntülemek için masanızdaki QR kodu okutun.',
};

export default function QrRootPage() {
    return (
        <div className="min-h-screen min-h-[100dvh] bg-[#e4e4e7] flex items-center justify-center p-4 font-sans">
            <div className="w-full max-w-[420px] bg-[#F9F9F7] rounded-[24px] p-8 text-center shadow-xl border border-[#E7E3DA]">
                <div className="w-20 h-20 rounded-2xl bg-white text-[#1C1B19] mx-auto flex items-center justify-center mb-5 shadow-sm border border-[#E7E3DA]">
                    <QrCode className="w-10 h-10 text-[#1C1B19]" />
                </div>
                <h1 className="text-2xl font-bold text-[#1C1B19] mb-2 tracking-tight">
                    Dijital QR Menü
                </h1>
                <p className="text-sm text-[#6B6862] leading-relaxed mb-6">
                    Restoran menüsünü ve güncel fiyatları görüntülemek için lütfen masanızdaki QR kodu kameranızla okutun.
                </p>
                <div className="flex items-center justify-center gap-2 text-xs font-medium text-[#1C1B19] bg-white px-4 py-2.5 rounded-full border border-[#E7E3DA] mx-auto w-fit">
                    <ScanLine className="w-4 h-4 text-[#1C1B19]" />
                    <span>QR Kod ile Doğrudan Erişim</span>
                </div>
            </div>
        </div>
    );
}
