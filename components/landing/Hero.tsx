'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export default function Hero() {
    const { t } = useTranslation();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');

    const handleSearch = () => {
        const q = searchQuery.trim();
        router.push(q ? `/tasks?query=${encodeURIComponent(q)}` : '/tasks');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleSearch();
    };

    return (
        <section style={{
            position: 'relative',
            padding: '120px 0 160px',
            overflow: 'hidden',
            backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.7)), url("https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&q=80&w=2000")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
        }} className="hero-section">


            <div className="container" style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
                <div className="animate-fade-in" style={{
                    display: 'inline-block',
                    padding: '8px 16px',
                    borderRadius: '50px',
                    background: 'rgba(37, 99, 235, 0.1)',
                    color: 'var(--primary)',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    marginBottom: '24px',
                    border: '1px solid rgba(37, 99, 235, 0.2)'
                }}>
                    ✨ {t('hero.badge')}
                </div>

                <h1 className="heading-xl animate-fade-in" style={{
                    maxWidth: '900px',
                    margin: '0 auto 24px',
                    animationDelay: '0.1s'
                }}>
                    {t('hero.titleStart')} <br />
                    <span style={{
                        background: 'linear-gradient(135deg, var(--primary) 0%, #1D4ED8 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>{t('hero.titleHighlight')}</span>
                </h1>

                <p className="animate-fade-in" style={{
                    fontSize: '1.25rem',
                    color: 'var(--text-light)',
                    maxWidth: '600px',
                    margin: '0 auto 48px',
                    lineHeight: '1.6',
                    animationDelay: '0.2s'
                }}>
                    {t('hero.subtitle')}
                </p>

                {/* Search Bar */}
                <div className="animate-fade-in hero-search" style={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    maxWidth: '720px',
                    margin: '0 auto 24px',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                    animationDelay: '0.3s'
                }}>
                    <div style={{ paddingLeft: '20px', color: '#6B7280', display: 'flex', alignItems: 'center' }}>
                        <Search size={24} color="#9CA3AF" />
                    </div>
                    <input
                        type="text"
                        placeholder={t('hero.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        style={{
                            flex: 1,
                            border: 'none',
                            padding: '16px 20px',
                            fontSize: '1.1rem',
                            outline: 'none',
                            color: '#1F2937',
                            backgroundColor: 'transparent'
                        }}
                    />
                    <button onClick={handleSearch} style={{
                        backgroundColor: '#6366F1', // Indigo-500 matching the image
                        color: 'white',
                        padding: '14px 40px',
                        borderRadius: '12px',
                        fontWeight: '700',
                        fontSize: '1.1rem',
                        border: 'none',
                        cursor: 'pointer',
                        textDecoration: 'none',
                        transition: 'background-color 0.2s'
                    }}>
                        {t('common.find')}
                    </button>
                </div>

                <div className="animate-fade-in hero-cta-row" style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '16px',
                    alignItems: 'center',
                    animationDelay: '0.4s',
                    marginTop: '32px',
                    flexWrap: 'wrap',
                }}>
                    <Link href="/create-task" className="btn btn-primary hero-cta-btn">
                        {t('hero.postTask')}
                    </Link>
                    <Link href="/register" className="btn btn-outline hero-cta-btn">
                        {t('hero.becomeProvider')}
                    </Link>
                </div>


            </div>

            <style>{`
                @media (max-width: 768px) {
                    .hero-section { padding: 60px 0 80px !important; }
                    .hero-search { flex-direction: column !important; border-radius: 12px !important; gap: 8px !important; padding: 12px !important; }
                    .hero-search input { padding: 12px 16px !important; font-size: 1rem !important; width: 100% !important; }
                    .hero-search button { width: 100% !important; border-radius: 8px !important; padding: 14px !important; }
                    .hero-cta-btn { min-width: 140px !important; width: 100%; max-width: 280px; }
                }
                @media (max-width: 480px) {
                    .hero-section { padding: 40px 0 60px !important; }
                }
            `}</style>
        </section>
    );
}
