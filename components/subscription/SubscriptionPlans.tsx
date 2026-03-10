'use client';
import { toast } from '@/components/ui/Toast';

import { useState } from 'react';

type Plan = {
    id: string;
    name: string;
    price: number;
    period: string;
    description: string;
    features: string[];
    color: string;
    popular?: boolean;
};

const plans: Plan[] = [
    {
        id: 'basic',
        name: 'Базовый',
        price: 99,
        period: 'мес',
        description: 'Отлично для начала',
        color: 'var(--primary)',
        features: [
            '15 откликов в месяц',
            'Улучшенная видимость',
            'Базовый значок',
            'Стандартный приоритет',
            'Email поддержка'
        ]
    },
    {
        id: 'standard',
        name: 'Стандарт',
        price: 199,
        period: 'мес',
        description: 'Идеально для роста',
        color: 'var(--accent)',
        popular: true,
        features: [
            '50 откликов в месяц',
            'Приоритетная видимость',
            'Проверенный значок',
            'Высокий приоритет',
            'Базовая аналитика',
            'Приоритетная поддержка'
        ]
    },
    {
        id: 'premium',
        name: 'Премиум',
        price: 399,
        period: 'мес',
        description: 'Для профессионалов',
        color: '#9333ea',
        features: [
            'Безлимитные отклики',
            'В топе исполнителей',
            'Премиум значок',
            'Высший приоритет',
            'Полная аналитика',
            'Персональный менеджер',
            '24/7 поддержка по телефону'
        ]
    }
];

type Props = {
    currentPlan: string | null;
    userId: string;
};

export default function SubscriptionPlans({ currentPlan }: Props) {
    const [loading, setLoading] = useState<string | null>(null);

    const handleSubscribe = async (planId: string) => {
        setLoading(planId);
        try {
            const res = await fetch('/api/subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan: planId })
            });

            const data = await res.json();

            if (res.ok && data.paymentUrl) {
                // Redirect to SmartPay payment page
                toast.success('Перенаправляем на страницу оплаты...');
                window.location.assign(data.paymentUrl);
            } else {
                toast.error(data.error || 'Не удалось создать платёж');
                setLoading(null);
            }
        } catch {
            toast.error('Произошла ошибка. Попробуйте еще раз.');
            setLoading(null);
        }
    };

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '24px'
        }}>
            {plans.map((plan) => (
                <div
                    key={plan.id}
                    style={{
                        backgroundColor: 'white',
                        borderRadius: '24px',
                        padding: '32px',
                        border: plan.popular ? `2px solid ${plan.color}` : '1px solid var(--border)',
                        position: 'relative',
                        transform: plan.popular ? 'scale(1.05)' : 'scale(1)',
                        boxShadow: plan.popular ? '0 20px 40px rgba(0,0,0,0.1)' : '0 4px 12px rgba(0,0,0,0.02)'
                    }}
                >
                    {plan.popular && (
                        <div style={{
                            position: 'absolute',
                            top: '-12px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            backgroundColor: plan.color,
                            color: 'white',
                            padding: '6px 20px',
                            borderRadius: '20px',
                            fontSize: '0.85rem',
                            fontWeight: '600'
                        }}>
                            Хит продаж
                        </div>
                    )}

                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                        <h3 style={{
                            fontSize: '1.5rem',
                            fontWeight: '700',
                            color: plan.color,
                            marginBottom: '8px'
                        }}>
                            {plan.name}
                        </h3>
                        <p style={{ color: 'var(--text-light)', fontSize: '0.95rem' }}>
                            {plan.description}
                        </p>
                    </div>

                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                        <span style={{ fontSize: '3rem', fontWeight: '800', color: 'var(--text)' }}>
                            {plan.price}
                        </span>
                        <span style={{ fontSize: '1.2rem', color: 'var(--text-light)' }}> с.</span>
                        <div style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>
                            в {plan.period}
                        </div>
                    </div>

                    <ul style={{ listStyle: 'none', padding: 0, marginBottom: '32px' }}>
                        {plan.features.map((feature, idx) => (
                            <li key={idx} style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '12px',
                                padding: '10px 0',
                                borderBottom: idx < plan.features.length - 1 ? '1px solid #f3f4f6' : 'none'
                            }}>
                                <span style={{ color: '#22c55e', fontSize: '1.1rem' }}>✓</span>
                                <span style={{ fontSize: '0.95rem', color: 'var(--text)' }}>{feature}</span>
                            </li>
                        ))}
                    </ul>

                    {currentPlan === plan.id ? (
                        <button
                            disabled
                            style={{
                                width: '100%',
                                padding: '16px',
                                borderRadius: '12px',
                                border: '2px solid #22c55e',
                                backgroundColor: '#f0fdf4',
                                color: '#166534',
                                fontWeight: '600',
                                fontSize: '1rem',
                                cursor: 'default'
                            }}
                        >
                            ✓ Текущий план
                        </button>
                    ) : (
                        <button
                            onClick={() => handleSubscribe(plan.id)}
                            disabled={loading !== null}
                            className="btn"
                            style={{
                                width: '100%',
                                padding: '16px',
                                borderRadius: '12px',
                                backgroundColor: plan.popular ? plan.color : 'transparent',
                                color: plan.popular ? 'white' : plan.color,
                                border: `2px solid ${plan.color}`,
                                fontWeight: '600',
                                fontSize: '1rem',
                                cursor: loading ? 'wait' : 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            {loading === plan.id ? 'Перенаправление...' : 'Оплатить'}
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}
