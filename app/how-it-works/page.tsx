import { FileText, MessageCircle, CheckCircle, Sparkles } from 'lucide-react';

export default function HowItWorksPage() {
    const steps = [
        {
            title: "1. Создайте задание",
            description: "Опишите, что нужно сделать, укажите бюджет и выберите удобное время.",
            icon: FileText,
            color: 'var(--primary)'
        },
        {
            title: "2. Получите предложения",
            description: "Получайте отклики от проверенных специалистов. Сравнивайте их профили, рейтинги и цены.",
            icon: MessageCircle,
            color: '#0EA5E9'
        },
        {
            title: "3. Выберите исполнителя",
            description: "Выберите лучшего специалиста для вашей задачи и обсудите детали в чате.",
            icon: CheckCircle,
            color: '#10B981'
        },
        {
            title: "4. Закройте сделку",
            description: "Специалист выполняет задание. Вы оплачиваете работу напрямую и оставляете отзыв.",
            icon: Sparkles,
            color: '#F59E0B'
        }
    ];

    return (
        <div style={{ padding: '60px 0' }}>
            <div className="container">
                <div style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto 60px' }}>
                    <h1 className="heading-lg" style={{ marginBottom: '24px' }}>Как работает Dastiyor</h1>
                    <p style={{ fontSize: '1.2rem', color: 'var(--text-light)' }}>
                        Найти помощь легко. Следуйте этим простым шагам, чтобы выполнить ваши задачи.
                    </p>
                </div>

                <div className="how-it-works-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '40px',
                    marginBottom: '80px'
                }}>
                    <style>{`
                        @media (max-width: 1024px) { .how-it-works-grid { grid-template-columns: repeat(2, 1fr) !important; } }
                        @media (max-width: 520px) { .how-it-works-grid { grid-template-columns: 1fr !important; } }
                    `}</style>
                    {steps.map((step, index) => {
                        const Icon = step.icon;
                        return (
                            <div key={index} style={{
                                textAlign: 'center',
                                padding: '32px',
                                backgroundColor: 'white',
                                borderRadius: '16px',
                                border: '1px solid var(--border)',
                                boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
                            }}>
                                <div style={{
                                    width: '64px',
                                    height: '64px',
                                    margin: '0 auto 24px',
                                    borderRadius: '50%',
                                    background: `${step.color}18`,
                                    color: step.color,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <Icon size={28} strokeWidth={2} />
                                </div>
                                <h3 className="heading-md" style={{ marginBottom: '16px' }}>{step.title}</h3>
                                <p style={{ color: 'var(--text-light)', lineHeight: '1.6' }}>{step.description}</p>
                            </div>
                        );
                    })}
                </div>

                <div style={{
                    backgroundColor: 'var(--primary)',
                    color: 'white',
                    borderRadius: '24px',
                    padding: '60px',
                    textAlign: 'center'
                }}>
                    <h2 className="heading-lg" style={{ color: 'white', marginBottom: '24px' }}>Готовы начать?</h2>
                    <p style={{ fontSize: '1.2rem', marginBottom: '32px', opacity: 0.9 }}>
                        Опубликуйте своё первое задание за секунды и найдите необходимую помощь.
                    </p>
                    <a href="/create-task" className="btn" style={{
                        backgroundColor: 'white',
                        color: 'var(--primary)',
                        padding: '16px 32px',
                        fontSize: '1.1rem',
                        display: 'inline-block'
                    }}>
                        Создать задание
                    </a>
                </div>
            </div>
        </div>
    );
}
