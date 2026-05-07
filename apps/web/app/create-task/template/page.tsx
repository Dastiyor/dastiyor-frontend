'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Lightbulb } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

const TASK_TEMPLATES = [
    {
        id: 'plumbing',
        name: 'Сантехнические работы',
        category: 'Сантехника',
        title: 'Ремонт сантехники',
        description: 'Требуется опытный сантехник для ремонта. Опишите проблему подробно.',
        budget: 'fixed',
        urgency: 'normal'
    },
    {
        id: 'cleaning',
        name: 'Уборка',
        category: 'Уборка',
        title: 'Генеральная уборка',
        description: 'Требуется профессиональная уборка. Укажите площадь и тип помещения.',
        budget: 'fixed',
        urgency: 'normal'
    },
    {
        id: 'delivery',
        name: 'Доставка',
        category: 'Доставка',
        title: 'Доставка груза',
        description: 'Требуется доставка. Укажите размер, вес и адреса отправления/назначения.',
        budget: 'fixed',
        urgency: 'normal'
    },
    {
        id: 'tech',
        name: 'IT и Техника',
        category: 'IT и Веб',
        title: 'Ремонт техники',
        description: 'Требуется специалист по ремонту техники. Опишите проблему и модель устройства.',
        budget: 'fixed',
        urgency: 'normal'
    },
    {
        id: 'electrician',
        name: 'Электрика',
        category: 'Электрик',
        title: 'Электромонтажные работы',
        description: 'Требуется электрик. Опишите объем работ и требования.',
        budget: 'fixed',
        urgency: 'normal'
    },
    {
        id: 'painting',
        name: 'Покраска',
        category: 'Ремонт',
        title: 'Покраска стен/потолка',
        description: 'Требуется маляр. Укажите площадь и тип поверхности.',
        budget: 'fixed',
        urgency: 'normal'
    }
];

export default function TaskTemplatePage() {
    const { t } = useTranslation();
    const router = useRouter();
    const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

    const handleUseTemplate = (template: typeof TASK_TEMPLATES[0]) => {
        // Store template data in sessionStorage and redirect to create-task
        const templateData = {
            category: template.category,
            title: template.title,
            description: template.description,
            budget: template.budget,
            urgency: template.urgency,
            fromTemplate: true
        };
        sessionStorage.setItem('task_template', JSON.stringify(templateData));
        router.push('/create-task');
    };

    return (
        <div style={{ backgroundColor: 'var(--secondary)', minHeight: '100vh', padding: '40px 0' }}>
            <div className="container" style={{ maxWidth: '1000px' }}>
                <div style={{ marginBottom: '32px', textAlign: 'center' }}>
                    <h1 className="heading-lg">{t('createTask.templatesTitle')}</h1>
                    <p style={{ color: 'var(--text-light)', marginTop: '8px' }}>
                        {t('createTask.templatesSubtitle')}
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                    {TASK_TEMPLATES.map((template) => (
                        <div
                            key={template.id}
                            style={{
                                backgroundColor: 'white',
                                borderRadius: '16px',
                                padding: '24px',
                                border: '1px solid var(--border)',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                borderWidth: selectedTemplate === template.id ? '2px' : '1px',
                                borderColor: selectedTemplate === template.id ? '#6366F1' : 'var(--border)'
                            }}
                            onMouseEnter={(e) => {
                                if (selectedTemplate !== template.id) {
                                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (selectedTemplate !== template.id) {
                                    e.currentTarget.style.boxShadow = 'none';
                                }
                            }}
                            onClick={() => setSelectedTemplate(template.id)}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                <div style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '12px',
                                    backgroundColor: '#EEF2FF',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#6366F1'
                                }}>
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <h3 style={{ fontWeight: '600', fontSize: '1.1rem', marginBottom: '4px' }}>
                                        {template.name}
                                    </h3>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
                                        {template.category}
                                    </div>
                                </div>
                            </div>

                            <div style={{
                                padding: '12px',
                                backgroundColor: '#F9FAFB',
                                borderRadius: '8px',
                                marginBottom: '16px'
                            }}>
                                <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '4px' }}>
                                    {template.title}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-light)', lineHeight: '1.5' }}>
                                    {template.description}
                                </div>
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleUseTemplate(template);
                                }}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    backgroundColor: '#6366F1',
                                    color: 'white',
                                    border: 'none',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    fontSize: '0.95rem'
                                }}
                            >
                                {t('createTask.useTemplate')}
                            </button>
                        </div>
                    ))}
                </div>

                <div style={{
                    marginTop: '40px',
                    backgroundColor: '#EFF6FF',
                    padding: '24px',
                    borderRadius: '16px',
                    border: '1px solid #BFDBFE',
                    display: 'flex',
                    gap: '16px',
                    alignItems: 'start'
                }}>
                    <Lightbulb size={24} color="#3B82F6" fill="#3B82F6" />
                    <div>
                        <h3 style={{ fontWeight: '600', marginBottom: '8px', color: '#1E40AF' }}>
                            {t('createTask.templateTip')}
                        </h3>
                        <p style={{ color: '#1E3A8A', fontSize: '0.95rem', lineHeight: '1.6' }}>
                            {t('createTask.templateTipDesc')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
