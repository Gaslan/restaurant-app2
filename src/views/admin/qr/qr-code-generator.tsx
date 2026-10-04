'use client';

import { useState, useEffect } from 'react';
import { Button, Card, Radio } from '@/components/ui';
import { Download } from 'lucide-react';

import {
    generateQRCodePNG,
    generateQRCodeSVG,
    downloadQRCode,
    type QRCodeSize
} from '@/lib/qr-utils';

interface QRCodeGeneratorProps {
    url: string;
    menuName: string;
}

export function QRCodeGenerator({ url, menuName }: QRCodeGeneratorProps) {
    const [size, setSize] = useState<QRCodeSize>('medium');
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);

    // URL veya boyut değiştiğinde QR kod'u yeniden oluştur
    useEffect(() => {
        async function generate() {
            setIsGenerating(true);
            try {
                const dataUrl = await generateQRCodePNG(url, size);
                setQrCodeDataUrl(dataUrl);
            } catch (error) {
                console.error('QR code generation failed:', error);
            } finally {
                setIsGenerating(false);
            }
        }

        generate();
    }, [url, size]);

    const handleDownloadPNG = () => {
        const filename = `qr-${menuName.toLowerCase().replace(/\s+/g, '-')}-${size}.png`;
        downloadQRCode(qrCodeDataUrl, filename);
    };

    const handleDownloadSVG = async () => {
        const svg = await generateQRCodeSVG(url);
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const blobUrl = URL.createObjectURL(blob);
        const filename = `qr-${menuName.toLowerCase().replace(/\s+/g, '-')}.svg`;

        downloadQRCode(blobUrl, filename);
        URL.revokeObjectURL(blobUrl);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* QR Code Preview */}
            <Card bodyClass="p-6">
                <div className="mb-4">
                    <h3 className="text-lg font-semibold leading-none tracking-tight">QR Kod Önizleme</h3>
                    <p className="text-sm text-muted-foreground mt-1.5">
                        Müşteriler bu QR kodu tarayarak menünüze erişebilir
                    </p>
                </div>
                <div className="flex flex-col items-center">
                    {isGenerating ? (
                        <div className="w-64 h-64 flex items-center justify-center bg-muted rounded">
                            <p className="text-muted-foreground">Oluşturuluyor...</p>
                        </div>
                    ) : (
                        <img
                            src={qrCodeDataUrl}
                            alt={`QR Code for ${menuName}`}
                            className="w-64 h-64 border rounded"
                        />
                    )}
                    <div className="mt-4 text-center">
                        <p className="text-sm font-medium">Menü URL:</p>
                        <code className="text-xs bg-muted px-2 py-1 rounded">{url}</code>
                    </div>
                </div>
            </Card>

            {/* Settings & Download */}
            <div className="space-y-6">
                <Card bodyClass="p-6">
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold leading-none tracking-tight">Boyut Seçimi</h3>
                    </div>
                    <div>
                        <Radio.Group value={size} onChange={(v) => setSize(v as QRCodeSize)} className="flex flex-col gap-3">
                            <Radio value="small">Küçük (256x256 px)</Radio>
                            <Radio value="medium">Orta (512x512 px)</Radio>
                            <Radio value="large">Büyük (1024x1024 px)</Radio>
                        </Radio.Group>
                    </div>
                </Card>

                <Card bodyClass="p-6">
                    <div className="mb-4">
                        <h3 className="text-lg font-semibold leading-none tracking-tight">İndir</h3>
                        <p className="text-sm text-muted-foreground mt-1.5">
                            QR kodunu farklı formatlarda indirebilirsiniz
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Button onClick={handleDownloadPNG} className="w-full">
                            <Download className="w-4 h-4 mr-2" />
                            PNG İndir ({size})
                        </Button>
                        <Button onClick={handleDownloadSVG} variant="plain" className="w-full border shadow-sm">
                            <Download className="w-4 h-4 mr-2" />
                            SVG İndir (Vektörel)
                        </Button>
                    </div>
                </Card>

                {/* Usage Instructions */}
                <Card className="bg-muted border-none" bodyClass="p-6">
                    <div className="mb-4">
                        <h3 className="text-base font-semibold leading-none tracking-tight">💡 Kullanım Önerileri</h3>
                    </div>
                    <div>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                            <li>QR kodu masalarınıza yazdırın</li>
                            <li>Müşteriler kendi telefonlarından menüyü görüntüleyebilir</li>
                            <li>Basılı menü maliyetinden tasarruf edin</li>
                            <li>Menüyü güncelledikçe QR kod aynı kalır</li>
                        </ul>
                    </div>
                </Card>
            </div>
        </div>
    );
}
