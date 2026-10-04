import React from 'react';
import type { Metadata } from 'next';
import { getPublicMenuByMenuId, serializePublicMenuData } from '@/lib/services/firestore-menu.service';
import { QrMenuView } from '@/views/qr/qr-menu-view';
import Link from 'next/link';
import { UtensilsCrossed, AlertTriangle } from 'lucide-react';

interface QrMenuPageProps {
    params: Promise<{ menuId: string }>;
}

export async function generateMetadata({ params }: QrMenuPageProps): Promise<Metadata> {
    const { menuId } = await params;
    const data = await getPublicMenuByMenuId(menuId);

    if (!data) {
        return {
            title: 'Menü Bulunamadı | Dijital QR Menü',
            description: 'Aradığınız dijital menü mevcut değil veya kaldırılmış olabilir.',
        };
    }

    const title = `${data.restaurant?.name || data.menu.name} | Dijital Menü`;
    const description = data.restaurant?.description || `${data.restaurant?.name || data.menu.name} dijital QR menüsü ve lezzetli yemekleri.`;

    return {
        title,
        description,
        openGraph: {
            title,
            description,
            images: data.restaurant?.logoUrl ? [data.restaurant.logoUrl] : [],
        },
    };
}

export default async function QrMenuPage({ params }: QrMenuPageProps) {
    const { menuId } = await params;

    // Fetch menu with categories and products, and restaurant details
    const rawData = await getPublicMenuByMenuId(menuId);

    if (!rawData || !rawData.menu) {
        return (
            <div className="min-h-screen min-h-[100dvh] bg-[#e4e4e7] flex items-center justify-center p-4">
                <div className="w-full max-w-[420px] bg-[#F9F9F7] rounded-[24px] p-8 text-center shadow-xl border border-[#E7E3DA]">
                    <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 mx-auto flex items-center justify-center mb-4">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <h1 className="text-xl font-bold text-[#1C1B19] mb-2">
                        Menü Bulunamadı
                    </h1>
                    <p className="text-sm text-[#6B6862] leading-relaxed mb-6">
                        Bu QR koda veya bağlantıya ait menü bulunamadı veya henüz yayında değil.
                    </p>
                    <div className="inline-flex items-center gap-2 text-xs text-[#6B6862] bg-white px-3 py-1.5 rounded-full border border-[#E7E3DA]">
                        <UtensilsCrossed className="w-4 h-4 text-[#1C1B19]" />
                        <span>Menü ID: {menuId}</span>
                    </div>
                </div>
            </div>
        );
    }

    // Safely serialize dates to strings for Client Component
    const data = serializePublicMenuData(rawData);

    return <QrMenuView menu={data.menu} restaurant={data.restaurant} />;
}
