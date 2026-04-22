import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import SubscriptionPlans from '@/components/subscription/SubscriptionPlans';

export default async function SubscriptionPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
        redirect('/login');
    }

    const payload = await verifyJWT(token);
    if (!payload || !payload.id) {
        redirect('/login');
    }

    const user = await prisma.user.findUnique({
        where: { id: payload.id as string },
        include: {
            subscription: true
        }
    });

    if (!user) {
        redirect('/login');
    }

    const currentSubscription = user.subscription;
    const isActive = currentSubscription?.isActive &&
        currentSubscription?.endDate &&
        new Date(currentSubscription.endDate) > new Date();

    return (
        <div style={{ backgroundColor: 'var(--secondary)', minHeight: '100vh', padding: '60px 0' }}>
            <div className="container" style={{ maxWidth: '1100px' }}>
                <div style={{ textAlign: 'center', marginBottom: '60px' }}>
                    <h1 className="heading-lg" style={{ fontSize: '2.5rem', marginBottom: '16px' }}>
                        Тарифные планы
                    </h1>
                    <p style={{ color: 'var(--text-light)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto' }}>
                        Разблокируйте премиум-возможности для развития вашего бизнеса и получения новых клиентов
                    </p>
                </div>

                {/* Current Subscription Status */}
                {isActive && currentSubscription && (
                    <div style={{
                        backgroundColor: '#f0fdf4',
                        border: '2px solid #22c55e',
                        borderRadius: '16px',
                        padding: '24px 32px',
                        marginBottom: '40px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                <span style={{ fontSize: '1.5rem' }}>✨</span>
                                <h3 style={{ fontSize: '1.3rem', fontWeight: '700', color: '#166534' }}>
                                    {currentSubscription.plan.charAt(0).toUpperCase() + currentSubscription.plan.slice(1)} План активен
                                </h3>
                            </div>
                            <p style={{ color: '#15803d' }}>
                                Ваша подписка активна до {new Date(currentSubscription.endDate).toLocaleDateString()}
                            </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '0.9rem', color: '#15803d', marginBottom: '4px' }}>
                                Осталось дней
                            </div>
                            <div style={{ fontSize: '2rem', fontWeight: '700', color: '#166534' }}>
                                {/* eslint-disable-next-line react-hooks/purity */}
                                {Math.ceil((new Date(currentSubscription.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Subscription Plans */}
                <SubscriptionPlans
                    currentPlan={isActive ? currentSubscription?.plan : null}
                    userId={user.id}
                />

                {/* Features Comparison */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '24px',
                    padding: '48px',
                    marginTop: '60px',
                    border: '1px solid var(--border)'
                }}>
                    <h2 className="heading-md" style={{ textAlign: 'center', marginBottom: '40px' }}>
                        Сравнение планов
                    </h2>

                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid var(--border)' }}>
                                <th style={{ textAlign: 'left', padding: '16px 0', fontWeight: '600' }}>Функции</th>
                                <th style={{ textAlign: 'center', padding: '16px 0', fontWeight: '600' }}>Бесплатно</th>
                                <th style={{ textAlign: 'center', padding: '16px 0', fontWeight: '600', color: 'var(--primary)' }}>Базовый</th>
                                <th style={{ textAlign: 'center', padding: '16px 0', fontWeight: '600', color: 'var(--accent)' }}>Стандарт</th>
                                <th style={{ textAlign: 'center', padding: '16px 0', fontWeight: '600', color: '#9333ea' }}>Премиум</th>
                            </tr>
                        </thead>
                        <tbody>
                            <FeatureRow feature="Просмотр заданий" free="✓" basic="✓" standard="✓" premium="✓" />
                            <FeatureRow feature="Отклики на задания" free="3/мес" basic="15/мес" standard="50/мес" premium="Неограниченно" />
                            <FeatureRow feature="Видимость профиля" free="Базовая" basic="Улучшенная" standard="Приоритетная" premium="Избранная" />
                            <FeatureRow feature="Приоритет отклика" free="—" basic="Стандарт" standard="Высокий" premium="Высший" />
                            <FeatureRow feature="Значок профиля" free="—" basic="✓" standard="✓" premium="✓" />
                            <FeatureRow feature="Аналитика" free="—" basic="—" standard="Базовая" premium="Полная" />
                            <FeatureRow feature="Поддержка" free="—" basic="—" standard="—" premium="✓" />
                        </tbody>
                    </table>
                </div>

                {/* FAQ */}
                <div style={{ marginTop: '60px', textAlign: 'center' }}>
                    <h3 className="heading-md" style={{ marginBottom: '16px' }}>Остались вопросы?</h3>
                    <p style={{ color: 'var(--text-light)', marginBottom: '24px' }}>
                        Свяжитесь с нашей службой поддержки для помощи в выборе плана
                    </p>
                    <Link href="/how-it-works" className="btn btn-outline">
                        Узнать больше
                    </Link>
                </div>
            </div>
        </div>
    );
}

function FeatureRow({ feature, free, basic, standard, premium }: {
    feature: string;
    free: string;
    basic: string;
    standard: string;
    premium: string;
}) {
    return (
        <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
            <td style={{ padding: '16px 0', color: 'var(--text)' }}>{feature}</td>
            <td style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-light)' }}>{free}</td>
            <td style={{ padding: '16px 0', textAlign: 'center' }}>{basic}</td>
            <td style={{ padding: '16px 0', textAlign: 'center' }}>{standard}</td>
            <td style={{ padding: '16px 0', textAlign: 'center' }}>{premium}</td>
        </tr>
    );
}
