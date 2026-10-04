import QRCode from 'qrcode';

export type QRCodeSize = 'small' | 'medium' | 'large';

const sizeMap = {
    small: 256,
    medium: 512,
    large: 1024
};

export async function generateQRCodePNG(url: string, size: QRCodeSize): Promise<string> {
    const width = sizeMap[size];
    try {
        const dataUrl = await QRCode.toDataURL(url, {
            width,
            margin: 2,
            type: 'image/png'
        });
        return dataUrl;
    } catch (err) {
        console.error('Error generating QR code PNG:', err);
        throw err;
    }
}

export async function generateQRCodeSVG(url: string): Promise<string> {
    try {
        const svgString = await QRCode.toString(url, {
            type: 'svg',
            margin: 2
        });
        return svgString;
    } catch (err) {
        console.error('Error generating QR code SVG:', err);
        throw err;
    }
}

export function downloadQRCode(dataUrl: string, filename: string) {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
