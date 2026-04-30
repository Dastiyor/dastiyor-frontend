type StepProps = {
    onNext: (data: any) => void;
    data: any;
};

const CATEGORIES = [
    { id: 'Ремонт', label: 'Ремонт', icon: '🔨' },
    { id: 'Уборка', label: 'Уборка', icon: '🧹' },
    { id: 'Доставка', label: 'Доставка', icon: '📦' },
    { id: 'IT и Веб', label: 'IT и Веб', icon: '💻' },
    { id: 'Красота', label: 'Красота и здоровье', icon: '💅' },
    { id: 'Юридические', label: 'Юридические услуги', icon: '⚖️' },
    { id: 'Мероприятия', label: 'Мероприятия', icon: '🎉' },
    { id: 'Обучение', label: 'Репетиторы и обучение', icon: '📚' },
    { id: 'Сантехника', label: 'Сантехника', icon: '🔧' },
    { id: 'Электрик', label: 'Электрик', icon: '⚡' },
];

export default function Step1Category({ onNext, data }: StepProps) {
    return (
        <div>
            <h2 className="heading-md" style={{ textAlign: 'center', marginBottom: '24px' }}>Какая помощь нужна?</h2>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: '16px'
            }}>
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => onNext({ category: cat.id })}
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px',
                            padding: '24px',
                            backgroundColor: data.category === cat.id ? '#e8f0fe' : 'var(--white)',
                            border: `2px solid ${data.category === cat.id ? 'var(--primary)' : 'var(--border)'}`,
                            borderRadius: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                    >
                        <span style={{ fontSize: '2rem' }}>{cat.icon}</span>
                        <span style={{ fontWeight: '500', color: data.category === cat.id ? 'var(--primary)' : 'var(--text)' }}>
                            {cat.label}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
