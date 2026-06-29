'use client';

import { useTranslation } from '@/lib/i18n';
import type { TaskFormData } from './types';

type StepProps = {
    onNext: (data: Partial<TaskFormData>) => void;
    data: TaskFormData;
};

const CATEGORIES = [
    { id: 'Ремонт', labelKey: 'categories.repair', icon: '🔨' },
    { id: 'Уборка', labelKey: 'categories.cleaning', icon: '🧹' },
    { id: 'Доставка', labelKey: 'categories.delivery', icon: '📦' },
    { id: 'Сантехника', labelKey: 'categories.plumbing', icon: '🔧' },
    { id: 'Электрик', labelKey: 'categories.electrician', icon: '⚡' },
    { id: 'Обучение', labelKey: 'categories.education', icon: '📚' },
    { id: 'Красота', labelKey: 'categories.beauty', icon: '💅' },
    { id: 'IT и Веб', labelKey: 'categories.itWeb', icon: '💻' },
    { id: 'Компьютерная помощь', labelKey: 'categories.computerHelp', icon: '🖥️' },
    { id: 'Ремонт техники', labelKey: 'categories.applianceRepair', icon: '📱' },
    { id: 'Фото и видео', labelKey: 'categories.photoVideo', icon: '📷' },
    { id: 'Дизайн', labelKey: 'categories.design', icon: '🎨' },
    { id: 'Мероприятия', labelKey: 'categories.events', icon: '🎉' },
    { id: 'Юридические услуги', labelKey: 'categories.legal', icon: '⚖️' },
    { id: 'Виртуальный помощник', labelKey: 'categories.virtualAssistant', icon: '🤖' },
];

export default function Step1Category({ onNext, data }: StepProps) {
    const { t } = useTranslation();

    return (
        <div>
            <h2 className="heading-md" style={{ textAlign: 'center', marginBottom: '24px' }}>{t('createTask.whatHelp')}</h2>

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
                            {t(cat.labelKey)}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}
