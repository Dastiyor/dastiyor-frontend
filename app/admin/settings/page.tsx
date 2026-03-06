'use client';

import { useState } from 'react';
import { Save, Globe, Bell, Shield, CreditCard, Mail } from 'lucide-react';

export default function AdminSettingsPage() {
    const [settings, setSettings] = useState({
        siteName: 'Dastiyor',
        siteDescription: 'Маркетплейс услуг в Таджикистане',
        supportEmail: 'support@dastiyor.tj',
        enableEmailNotifications: true,
        enableSMSNotifications: false,
        requireEmailVerification: true,
        maintenanceMode: false,
        allowNewRegistrations: true,
        defaultCurrency: 'TJS',
        minTaskBudget: '10',
        freeTrialDays: '7',
    });

    const [saved, setSaved] = useState(false);

    const handleChange = (key: string, value: string | boolean) => {
        setSettings(prev => ({ ...prev, [key]: value }));
        setSaved(false);
    };

    const handleSave = () => {
        // In production, this would save to database
        console.log('Saving settings:', settings);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <h2 className="heading-lg">Настройки системы</h2>
                <button
                    onClick={handleSave}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        backgroundColor: saved ? '#10B981' : '#6366F1',
                        color: 'white',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        border: 'none',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                    }}
                >
                    <Save size={18} />
                    {saved ? 'Сохранено!' : 'Сохранить'}
                </button>
            </div>

            {/* General Settings */}
            <SettingsSection icon={<Globe size={20} />} title="Общие настройки">
                <SettingsInput
                    label="Название сайта"
                    value={settings.siteName}
                    onChange={(v) => handleChange('siteName', v)}
                />
                <SettingsInput
                    label="Описание сайта"
                    value={settings.siteDescription}
                    onChange={(v) => handleChange('siteDescription', v)}
                />
                <SettingsInput
                    label="Email поддержки"
                    value={settings.supportEmail}
                    onChange={(v) => handleChange('supportEmail', v)}
                    type="email"
                />
            </SettingsSection>

            {/* Notification Settings */}
            <SettingsSection icon={<Bell size={20} />} title="Уведомления">
                <SettingsToggle
                    label="Email уведомления"
                    description="Отправлять уведомления по электронной почте"
                    checked={settings.enableEmailNotifications}
                    onChange={(v) => handleChange('enableEmailNotifications', v)}
                />
                <SettingsToggle
                    label="SMS уведомления"
                    description="Отправлять уведомления по SMS (требует настройки)"
                    checked={settings.enableSMSNotifications}
                    onChange={(v) => handleChange('enableSMSNotifications', v)}
                />
                {settings.enableSMSNotifications && (
                    <div style={{ marginTop: '-10px', marginBottom: '16px', padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#4B5563' }}>Тест отправки SMS</h4>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="text"
                                placeholder="+992XXXXXXXXX"
                                id="test-sms-phone"
                                style={{
                                    flex: 1,
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    border: '1px solid #D1D5DB',
                                    outline: 'none'
                                }}
                            />
                            <button
                                onClick={async () => {
                                    const phoneInput = document.getElementById('test-sms-phone') as HTMLInputElement;
                                    const phone = phoneInput.value;
                                    if (!phone) return alert('Введите номер телефона');

                                    try {
                                        const res = await fetch('/api/admin/test-sms', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ phone, message: 'Test message from Dastiyor Admin' })
                                        });
                                        const data = await res.json();
                                        if (data.success) {
                                            alert('SMS успешно отправлено!');
                                            phoneInput.value = '';
                                        } else {
                                            alert('Ошибка: ' + (data.error || 'Unknown error'));
                                        }
                                    } catch (e) {
                                        alert('Ошибка сети');
                                        console.error(e);
                                    }
                                }}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#4F46E5',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                    fontSize: '0.9rem'
                                }}
                            >
                                Отправить тест
                            </button>
                        </div>
                    </div>
                )}
                <div style={{ marginTop: '16px', padding: '16px', backgroundColor: '#F9FAFB', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#4B5563' }}>Тест отправки email (Brevo)</h4>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                            type="email"
                            placeholder="email@example.com"
                            id="test-email-to"
                            style={{
                                flex: 1,
                                padding: '8px 12px',
                                borderRadius: '6px',
                                border: '1px solid #D1D5DB',
                                outline: 'none'
                            }}
                        />
                        <button
                            onClick={async () => {
                                const input = document.getElementById('test-email-to') as HTMLInputElement;
                                const to = input?.value?.trim();
                                if (!to) return alert('Введите email');

                                try {
                                    const res = await fetch('/api/admin/test-email', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ to })
                                    });
                                    const data = await res.json();
                                    if (data.success) {
                                        alert('Письмо отправлено! Проверьте почту.');
                                        input.value = '';
                                    } else {
                                        alert('Ошибка: ' + (data.error || 'Unknown error'));
                                    }
                                } catch (e) {
                                    alert('Ошибка сети');
                                    console.error(e);
                                }
                            }}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: '#059669',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: '500',
                                fontSize: '0.9rem'
                            }}
                        >
                            Отправить тест
                        </button>
                    </div>
                </div>
            </SettingsSection>

            {/* Security Settings */}
            <SettingsSection icon={<Shield size={20} />} title="Безопасность">
                <SettingsToggle
                    label="Подтверждение email"
                    description="Требовать подтверждение email при регистрации"
                    checked={settings.requireEmailVerification}
                    onChange={(v) => handleChange('requireEmailVerification', v)}
                />
                <SettingsToggle
                    label="Разрешить регистрацию"
                    description="Новые пользователи могут регистрироваться"
                    checked={settings.allowNewRegistrations}
                    onChange={(v) => handleChange('allowNewRegistrations', v)}
                />
                <SettingsToggle
                    label="Режим обслуживания"
                    description="Отключить сайт для пользователей на время обслуживания"
                    checked={settings.maintenanceMode}
                    onChange={(v) => handleChange('maintenanceMode', v)}
                    warning
                />
            </SettingsSection>

            {/* Payment Settings */}
            <SettingsSection icon={<CreditCard size={20} />} title="Платежи и подписки">
                <SettingsInput
                    label="Валюта"
                    value={settings.defaultCurrency}
                    onChange={(v) => handleChange('defaultCurrency', v)}
                />
                <SettingsInput
                    label="Минимальный бюджет задания"
                    value={settings.minTaskBudget}
                    onChange={(v) => handleChange('minTaskBudget', v)}
                    type="number"
                />
                <SettingsInput
                    label="Бесплатный период (дней)"
                    value={settings.freeTrialDays}
                    onChange={(v) => handleChange('freeTrialDays', v)}
                    type="number"
                />
            </SettingsSection>

            {/* Info Box */}
            <div style={{
                marginTop: '24px',
                padding: '20px 24px',
                backgroundColor: '#EEF2FF',
                borderRadius: '12px',
                border: '1px solid #C7D2FE',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
            }}>
                <Mail size={20} color="#6366F1" style={{ marginTop: '2px' }} />
                <div>
                    <p style={{ color: '#4338CA', fontWeight: '600', marginBottom: '4px' }}>
                        Настройка email (Brevo)
                    </p>
                    <p style={{ color: '#6366F1', fontSize: '0.9rem' }}>
                        В .env задайте BREVO_API_KEY и BREVO_FROM_EMAIL (адрес проверенного отправителя в Brevo). Затем проверьте отправку через «Тест отправки email» выше.
                    </p>
                </div>
            </div>
        </div>
    );
}

function SettingsSection({ icon, title, children }: {
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            border: '1px solid #e5e7eb',
            marginBottom: '24px',
            overflow: 'hidden'
        }}>
            <div style={{
                padding: '20px 24px',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                backgroundColor: '#f9fafb'
            }}>
                <span style={{ color: '#6366F1' }}>{icon}</span>
                <h3 style={{ fontWeight: '600', fontSize: '1.1rem' }}>{title}</h3>
            </div>
            <div style={{ padding: '24px' }}>
                {children}
            </div>
        </div>
    );
}

function SettingsInput({ label, value, onChange, type = 'text' }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    type?: string;
}) {
    return (
        <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
                {label}
            </label>
            <input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                style={{
                    width: '100%',
                    maxWidth: '400px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    fontSize: '0.95rem',
                    outline: 'none'
                }}
            />
        </div>
    );
}

function SettingsToggle({ label, description, checked, onChange, warning = false }: {
    label: string;
    description: string;
    checked: boolean;
    onChange: (v: boolean) => void;
    warning?: boolean;
}) {
    return (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 0',
            borderBottom: '1px solid #f3f4f6'
        }}>
            <div>
                <div style={{ fontWeight: '500', color: warning ? '#DC2626' : '#374151' }}>{label}</div>
                <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '2px' }}>{description}</div>
            </div>
            <button
                onClick={() => onChange(!checked)}
                style={{
                    width: '48px',
                    height: '26px',
                    borderRadius: '13px',
                    backgroundColor: checked ? (warning ? '#DC2626' : '#6366F1') : '#D1D5DB',
                    border: 'none',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'background-color 0.2s'
                }}
            >
                <span style={{
                    position: 'absolute',
                    top: '3px',
                    left: checked ? '25px' : '3px',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: 'white',
                    transition: 'left 0.2s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                }} />
            </button>
        </div>
    );
}
