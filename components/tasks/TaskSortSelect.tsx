'use client';

export default function TaskSortSelect({ defaultValue }: { defaultValue?: string }) {
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const url = new URL(window.location.href);
        url.searchParams.set('sort', e.target.value);
        window.location.href = url.toString();
    };

    const labels: Record<string, string> = {
        newest: 'Recent',
        'budget-high': 'High Budget',
        'budget-low': 'Low Budget',
    };

    return (
        <select
            defaultValue={defaultValue || 'newest'}
            onChange={handleChange}
            style={{
                backgroundColor: 'var(--white)',
                border: '1px solid var(--border)',
                padding: '10px 36px 10px 16px',
                borderRadius: '8px',
                fontWeight: '600',
                color: 'var(--text-light)',
                fontSize: '0.95rem',
                boxShadow: 'var(--shadow-sm)',
                cursor: 'pointer',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 10px center',
            }}
        >
            {Object.entries(labels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
            ))}
        </select>
    );
}
