'use client';

import { useState } from 'react';
import { Dialog, Button, Input, Select } from '@/components/ui';
import {
    TrendingUp,
    TrendingDown,
    Percent,
    Coins,
    Sparkles,
} from 'lucide-react';
import classNames from '@/utils/classNames';

export type PriceDirection = 'increase' | 'decrease';
export type PriceChangeType = 'percentage' | 'fixed';
export type RoundingType = 'round_005' | 'round_050' | 'round_integer' | 'none';

export interface BatchPriceFormData {
    direction: PriceDirection;
    type: PriceChangeType;
    value: string;
    rounding: RoundingType;
}

interface BatchPriceModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    selectedCount: number;
    currency?: string;
    onApply?: (data: BatchPriceFormData) => void;
}

const ROUNDING_OPTIONS: { value: RoundingType; label: string }[] = [
    { value: 'none', label: 'Yuvarlama' },
    { value: 'round_005', label: "0.05'in katlarına en yakın değere yuvarla" },
    { value: 'round_050', label: "0.50'nin katlarına en yakın değere yuvarla" },
    { value: 'round_integer', label: 'Tam sayı olarak yuvarla' },
];

export function BatchPriceModal({
    open,
    onOpenChange,
    selectedCount,
    currency = 'TRY',
    onApply,
}: BatchPriceModalProps) {
    const [direction, setDirection] = useState<PriceDirection>('increase');
    const [changeType, setChangeType] = useState<PriceChangeType>('percentage');
    const [value, setValue] = useState<string>('');
    const [rounding, setRounding] = useState<RoundingType>('none');

    const handleApply = () => {
        onApply?.({
            direction,
            type: changeType,
            value,
            rounding,
        });
        onOpenChange(false);
    };

    const selectedRoundingOption =
        ROUNDING_OPTIONS.find((opt) => opt.value === rounding) || ROUNDING_OPTIONS[0];

    return (
        <Dialog
            isOpen={open}
            onClose={() => onOpenChange(false)}
            onRequestClose={() => onOpenChange(false)}
            width={520}
        >
            <div className="space-y-5">
                {/* Header */}
                <div>
                    <h5 className="font-bold text-lg heading-text flex items-center gap-2">
                        <span>Fiyat Değiştir</span>
                    </h5>
                    <p className="text-xs text-muted-foreground mt-1">
                        Seçilen <strong className="text-gray-900 dark:text-gray-100">{selectedCount}</strong> ürün için toplu fiyat güncelleme ayarlarını belirleyin.
                    </p>
                </div>

                <div className="space-y-4 pt-1">
                    {/* 1. Fiyat Yönü (Azalacak mı / Artacak mı) */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            İşlem Yönü
                        </label>
                        <div className="grid grid-cols-2 gap-2.5">
                            <button
                                type="button"
                                onClick={() => setDirection('increase')}
                                className={classNames(
                                    'flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-medium transition-all select-none',
                                    direction === 'increase'
                                        ? 'border-emerald-500 bg-emerald-50/70 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 ring-1 ring-emerald-500 shadow-sm'
                                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'
                                )}
                            >
                                <TrendingUp className="h-4 w-4" />
                                <span>Fiyatı Artır</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setDirection('decrease')}
                                className={classNames(
                                    'flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-medium transition-all select-none',
                                    direction === 'decrease'
                                        ? 'border-rose-500 bg-rose-50/70 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 ring-1 ring-rose-500 shadow-sm'
                                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'
                                )}
                            >
                                <TrendingDown className="h-4 w-4" />
                                <span>Fiyatı Azalt</span>
                            </button>
                        </div>
                    </div>

                    {/* 2. Değişim Türü (Yüzde mi / Miktar mı) */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Değişim Türü
                        </label>
                        <div className="grid grid-cols-2 gap-2.5">
                            <button
                                type="button"
                                onClick={() => setChangeType('percentage')}
                                className={classNames(
                                    'flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-medium transition-all select-none',
                                    changeType === 'percentage'
                                        ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary shadow-sm'
                                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'
                                )}
                            >
                                <Percent className="h-4 w-4" />
                                <span>Yüzde (%)</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setChangeType('fixed')}
                                className={classNames(
                                    'flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-medium transition-all select-none',
                                    changeType === 'fixed'
                                        ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary shadow-sm'
                                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'
                                )}
                            >
                                <Coins className="h-4 w-4" />
                                <span>Sabit Miktar</span>
                            </button>
                        </div>
                    </div>

                    {/* 3. Miktar / Değer Girişi */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                            {changeType === 'percentage' ? 'Yüzde Oranı (%)' : 'Miktar'}
                        </label>
                        <Input
                            type="number"
                            min="0"
                            step="any"
                            placeholder={changeType === 'percentage' ? 'Örn: 10' : 'Örn: 25.00'}
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            suffix={
                                changeType === 'percentage' ? (
                                    <Percent className="h-4 w-4 text-gray-500" />
                                ) : (
                                    <Coins className="h-4 w-4 text-gray-500" />
                                )
                            }
                        />
                    </div>

                    {/* 4. Yuvarlama Tipi */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center justify-between">
                            <span>Yuvarlama Tipi</span>
                            <span className="text-[11px] text-muted-foreground font-normal">
                                Sonuç fiyatı biçimlendirir
                            </span>
                        </label>
                        <Select
                            options={ROUNDING_OPTIONS}
                            value={selectedRoundingOption}
                            onChange={(option: any) => {
                                if (option?.value) {
                                    setRounding(option.value as RoundingType);
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <Button
                        variant="default"
                        onClick={() => onOpenChange(false)}
                    >
                        Vazgeç
                    </Button>
                    <Button
                        variant="solid"
                        onClick={handleApply}
                    >
                        Uygula
                    </Button>
                </div>
            </div>
        </Dialog>
    );
}
