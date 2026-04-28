import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: 'Мобильное приложение | Dastiyor',
    description: 'Мобильное приложение Dastiyor — скоро в App Store и Google Play.',
};

export default function MobileAppPage() {
    return (
        <div className="container" style={{ padding: '80px 20px', maxWidth: '600px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>📱</div>
            <h1 className="heading-lg" style={{ marginBottom: '16px' }}>Мобильное приложение</h1>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-light)', lineHeight: '1.7', marginBottom: '40px' }}>
                Мы работаем над мобильным приложением Dastiyor для iOS и Android. Скоро вы сможете создавать
                задания, общаться с исполнителями и отслеживать статус прямо со смартфона.
            </p>

            <div style={{
                padding: '32px',
                backgroundColor: 'var(--background)',
                borderRadius: '16px',
                border: '1px solid var(--border)',
                marginBottom: '40px'
            }}>
                <p style={{ fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>Хотите узнать первыми?</p>
                <p style={{ color: 'var(--text-light)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                    Следите за новостями в нашем Telegram-канале или напишите нам на{' '}
                    <a href="mailto:support@dastiyor.com" rel="nofollow" style={{ color: 'var(--primary)' }}>support[at]dastiyor.com</a>,
                    чтобы мы уведомили вас о запуске.
                </p>
            </div>

            <p style={{ color: 'var(--text-light)', fontSize: '0.95rem', marginBottom: '24px' }}>
                А пока — пользуйтесь полной версией сайта, адаптированной для мобильных устройств.
            </p>

            <Link href="/tasks" className="btn btn-primary" style={{ padding: '14px 32px', display: 'inline-block' }}>
                Перейти к заданиям
            </Link>
        </div>
    );
}
