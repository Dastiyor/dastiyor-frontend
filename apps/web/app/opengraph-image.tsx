import { ImageResponse } from 'next/og';

// The link preview image for every page (Telegram, WhatsApp, iMessage...). The layout used to
// point at /opengraph-image.png, which never existed, so shared links had a broken preview.
// Latin text only: ImageResponse's built-in font has no Cyrillic.
export const alt = 'Dastiyor';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const MARK = [
    'M 116.31 466.93 A 260 260 0 1 1 577.69 466.93 A 312 312 0 0 0 116.31 466.93 Z',
    'M 557.07 116.31 A 260 260 0 1 1 557.07 577.69 A 312 312 0 0 0 557.07 116.31 Z',
    'M 907.69 557.07 A 260 260 0 1 1 446.31 557.07 A 312 312 0 0 0 907.69 557.07 Z',
    'M 466.93 907.69 A 260 260 0 1 1 466.93 446.31 A 312 312 0 0 0 466.93 907.69 Z',
];

export default function OpengraphImage() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 36,
                    background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)', color: '#fff',
                }}
            >
                <div style={{ display: 'flex', width: 180, height: 180, borderRadius: 44, background: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="128" height="128" viewBox="0 0 1024 1024">
                        {MARK.map((d) => <path key={d} fill="#2563EB" d={d} />)}
                    </svg>
                </div>
                <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: -2 }}>Dastiyor</div>
                <div style={{ fontSize: 36, opacity: 0.85 }}>dastiyor.com</div>
            </div>
        ),
        size,
    );
}
