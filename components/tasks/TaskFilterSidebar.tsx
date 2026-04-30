'use client';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { LayoutGrid, Wrench, Monitor, SprayCan, Truck, Zap, Clock, Calendar } from 'lucide-react';
import { useState, useCallback, useTransition } from 'react';

const CATEGORIES = [
    { name: 'Все задания', value: '', icon: LayoutGrid },
    { name: 'Ремонт', value: 'Ремонт', icon: Wrench },
    { name: 'IT и Веб', value: 'IT и Веб', icon: Monitor },
    { name: 'Уборка', value: 'Уборка', icon: SprayCan },
    { name: 'Доставка', value: 'Доставка', icon: Truck },
    { name: 'Сантехника', value: 'Сантехника', icon: Wrench },
    { name: 'Обучение', value: 'Обучение', icon: Monitor },
];

const CITIES = [
    'Душанбе',
    'Худжанд',
    'Бохтар',
    'Кӯлоб',
    'Истаравшан',
    'Турсунзода',
    'Онлайн',
];

const URGENCY_OPTIONS = [
    { label: 'Срочно', value: 'urgent', icon: Zap },
    { label: 'Обычная', value: 'normal', icon: Clock },
    { label: 'Гибкий график', value: 'low', icon: Calendar },
];

interface TaskFilterSidebarProps {
    categoryCounts?: any[];
    totalOpenTasks?: number;
}

export default function TaskFilterSidebar({ categoryCounts = [], totalOpenTasks = 0 }: TaskFilterSidebarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    // Get current values from URL
    const currentCategory = searchParams.get('category') || '';
    const currentCity = searchParams.get('city') || '';
    const currentMinBudget = searchParams.get('minBudget') || '';
    const currentMaxBudget = searchParams.get('maxBudget') || '';
    const currentUrgency = searchParams.get('urgency')?.split(',').filter(Boolean) || [];

    // Local state for budget inputs
    const [minBudget, setMinBudget] = useState(currentMinBudget);
    const [maxBudget, setMaxBudget] = useState(currentMaxBudget);

    // Create URL with new params
    const createQueryString = useCallback(
        (updates: Record<string, string | null>) => {
            const params = new URLSearchParams(searchParams.toString());

            Object.entries(updates).forEach(([key, value]) => {
                if (value === null || value === '') {
                    params.delete(key);
                } else {
                    params.set(key, value);
                }
            });

            return params.toString();
        },
        [searchParams]
    );

    const handleCategoryClick = (value: string) => {
        startTransition(() => {
            const queryString = createQueryString({ category: value || null });
            router.push(queryString ? `${pathname}?${queryString}` : pathname);
        });
    };

    const handleCityChange = (value: string) => {
        startTransition(() => {
            const queryString = createQueryString({ city: value || null });
            router.push(queryString ? `${pathname}?${queryString}` : pathname);
        });
    };

    const handleUrgencyChange = (value: string, checked: boolean) => {
        let newUrgency: string[];
        if (checked) {
            newUrgency = [...currentUrgency, value];
        } else {
            newUrgency = currentUrgency.filter(u => u !== value);
        }

        startTransition(() => {
            const queryString = createQueryString({
                urgency: newUrgency.length > 0 ? newUrgency.join(',') : null
            });
            router.push(queryString ? `${pathname}?${queryString}` : pathname);
        });
    };

    const handleBudgetApply = () => {
        startTransition(() => {
            const queryString = createQueryString({
                minBudget: minBudget || null,
                maxBudget: maxBudget || null
            });
            router.push(queryString ? `${pathname}?${queryString}` : pathname);
        });
    };

    const clearFilters = () => {
        setMinBudget('');
        setMaxBudget('');
        startTransition(() => {
            router.push(pathname);
        });
    };

    const hasActiveFilters = currentCategory || currentCity || currentMinBudget || currentMaxBudget || currentUrgency.length > 0;

    const getCategoryCount = (value: string) => {
        if (!value) return totalOpenTasks;
        const countObj = categoryCounts.find(c => c.category === value);
        return countObj ? countObj._count : 0;
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            opacity: isPending ? 0.7 : 1,
            transition: 'opacity 0.2s',
            width: '100%',
        }}>
            {/* Categories Card */}
            <div style={{
                backgroundColor: 'var(--white)',
                padding: '24px',
                borderRadius: '16px',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-sm)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text)' }}>Категории</h4>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6" /></svg>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {CATEGORIES.map((cat) => {
                        const Icon = cat.icon;
                        const isActive = currentCategory === cat.value;
                        const count = getCategoryCount(cat.value);

                        return (
                            <button
                                key={cat.value || 'all'}
                                onClick={() => handleCategoryClick(cat.value)}
                                type="button"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '12px 14px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    backgroundColor: isActive ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                                    color: isActive ? 'var(--primary)' : 'var(--text-light)',
                                    transition: 'all 0.2s',
                                    width: '100%'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <Icon size={18} style={{ color: isActive ? 'var(--primary)' : 'var(--text-light)' }} />
                                    <span style={{ fontWeight: isActive ? '700' : '500', fontSize: '0.95rem' }}>{cat.name}</span>
                                </div>
                                <span style={{
                                    fontSize: '0.8rem',
                                    fontWeight: '700',
                                    color: isActive ? 'var(--primary)' : 'var(--text-light)',
                                    opacity: count > 0 ? 1 : 0.5
                                }}>
                                    {count.toLocaleString()}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Location Card */}
            <div style={{
                backgroundColor: 'var(--white)',
                padding: '24px',
                borderRadius: '16px',
                border: '1px solid var(--border)',
            }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text)', marginBottom: '16px' }}>Город</h4>
                <div style={{ position: 'relative' }}>
                    <select
                        value={currentCity}
                        onChange={(e) => handleCityChange(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px 16px',
                            borderRadius: '10px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--secondary)',
                            outline: 'none',
                            fontSize: '0.95rem',
                            color: 'var(--text)',
                            cursor: 'pointer',
                            appearance: 'none',
                            fontWeight: '500'
                        }}
                    >
                        <option value="">Все города</option>
                        {CITIES.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                    <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                    </div>
                </div>
            </div>

            {/* Budget Range Card */}
            <div style={{
                backgroundColor: 'var(--white)',
                padding: '24px',
                borderRadius: '16px',
                border: '1px solid var(--border)',
            }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text)', marginBottom: '20px' }}>Бюджет</h4>

                {/* Functional Dual Range Slider */}
                <div style={{ padding: '0 10px', marginBottom: '32px', position: 'relative' }}>
                    <div style={{ height: '4px', backgroundColor: 'var(--border)', position: 'relative', borderRadius: '4px' }}>
                        <div style={{
                            position: 'absolute',
                            left: `${(parseInt(minBudget || '0') / 5000) * 100}%`,
                            right: `${100 - (parseInt(maxBudget || '5000') / 5000) * 100}%`,
                            height: '100%',
                            backgroundColor: 'var(--primary)',
                            borderRadius: '4px'
                        }}></div>
                    </div>

                    <input
                        type="range"
                        min="0"
                        max="5000"
                        value={minBudget || 0}
                        onChange={(e) => {
                            const val = Math.min(parseInt(e.target.value), parseInt(maxBudget || '5000') - 100);
                            setMinBudget(val.toString());
                        }}
                        style={{
                            position: 'absolute',
                            top: '-5px',
                            left: '0',
                            width: '100%',
                            appearance: 'none',
                            background: 'none',
                            pointerEvents: 'none'
                        }}
                        className="range-input"
                    />
                    <input
                        type="range"
                        min="0"
                        max="5000"
                        value={maxBudget || 5000}
                        onChange={(e) => {
                            const val = Math.max(parseInt(e.target.value), parseInt(minBudget || '0') + 100);
                            setMaxBudget(val.toString());
                        }}
                        style={{
                            position: 'absolute',
                            top: '-5px',
                            left: '0',
                            width: '100%',
                            appearance: 'none',
                            background: 'none',
                            pointerEvents: 'none'
                        }}
                        className="range-input"
                    />

                    <style jsx>{`
                        .range-input::-webkit-slider-thumb {
                            height: 18px;
                            width: 18px;
                            border-radius: 50%;
                            background: var(--primary);
                            border: 3px solid white;
                            box-shadow: 0 0 0 1px var(--primary);
                            cursor: pointer;
                            appearance: none;
                            pointer-events: auto;
                            margin-top: -1px;
                        }
                    `}</style>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', fontSize: '0.75rem', color: 'var(--text-light)', fontWeight: '600' }}>
                        <span>0 TJS</span>
                        <span>5 000+ TJS</span>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '16px' }}>
                    <div style={{ flex: 1, backgroundColor: 'var(--secondary)', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 12px', height: '42px' }}>
                        <input
                            type="number"
                            value={minBudget}
                            onChange={(e) => setMinBudget(e.target.value)}
                            placeholder="0"
                            style={{
                                width: '100%',
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                fontSize: '0.9rem',
                                fontWeight: '600',
                                color: 'var(--text)'
                            }}
                        />
                        <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-light)', marginLeft: '4px', whiteSpace: 'nowrap' }}>TJS</span>
                    </div>
                    <span style={{ color: 'var(--text-light)', fontWeight: '500' }}>-</span>
                    <div style={{ flex: 1, backgroundColor: 'var(--secondary)', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 12px', height: '42px' }}>
                        <input
                            type="number"
                            value={maxBudget}
                            onChange={(e) => setMaxBudget(e.target.value)}
                            placeholder="5000"
                            style={{
                                width: '100%',
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                fontSize: '0.9rem',
                                fontWeight: '600',
                                color: 'var(--text)'
                            }}
                        />
                        <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-light)', marginLeft: '4px', whiteSpace: 'nowrap' }}>TJS</span>
                    </div>
                </div>

                <button
                    onClick={handleBudgetApply}
                    type="button"
                    style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: 'var(--primary)',
                        color: 'var(--white)',
                        border: 'none',
                        borderRadius: '10px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        transition: 'opacity 0.2s'
                    }}
                >
                    Применить
                </button>
            </div>

            {/* Urgency Card */}
            <div style={{
                backgroundColor: 'var(--white)',
                padding: '24px',
                borderRadius: '16px',
                border: '1px solid var(--border)',
            }}>
                <h4 style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--text)', marginBottom: '16px' }}>Срочность</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {[
                        { label: 'Как можно скорее', value: 'urgent' },
                        { label: 'В течение недели', value: 'normal' },
                        { label: 'Гибкий график', value: 'low' }
                    ].map((opt) => {
                        const isChecked = currentUrgency.includes(opt.value);
                        return (
                            <label
                                key={opt.value}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    fontSize: '0.95rem',
                                    color: 'var(--text)',
                                    cursor: 'pointer',
                                    fontWeight: '500'
                                }}
                            >
                                <div style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '5px',
                                    border: isChecked ? 'none' : '2px solid var(--border)',
                                    backgroundColor: isChecked ? 'var(--primary)' : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s'
                                }}>
                                    {isChecked && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => handleUrgencyChange(opt.value, e.target.checked)}
                                        style={{ display: 'none' }}
                                    />
                                </div>
                                {opt.label}
                            </label>
                        );
                    })}
                </div>
            </div>

            {hasActiveFilters && (
                <button
                    onClick={clearFilters}
                    style={{
                        padding: '12px',
                        backgroundColor: 'transparent',
                        color: 'var(--text-light)',
                        border: '1px dashed var(--border)',
                        borderRadius: '10px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        transition: 'all 0.2s'
                    }}
                >
                    Сбросить фильтры
                </button>
            )}
        </div>
    );
}
