'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    type?: 'danger' | 'warning' | 'info';
}

export function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmText = 'Подтвердить',
    cancelText = 'Отмена',
    onConfirm,
    onCancel,
    type = 'warning'
}: ConfirmDialogProps) {
    const [isVisible, setIsVisible] = useState(isOpen);

    if (!isOpen) return null;

    const handleConfirm = () => {
        setIsVisible(false);
        setTimeout(() => {
            onConfirm();
        }, 200);
    };

    const handleCancel = () => {
        setIsVisible(false);
        setTimeout(() => {
            onCancel();
        }, 200);
    };

    const getColors = () => {
        switch (type) {
            case 'danger':
                return {
                    icon: '#EF4444',
                    button: '#DC2626',
                    buttonHover: '#B91C1C',
                    bg: '#FEF2F2',
                    border: '#FECACA'
                };
            case 'warning':
                return {
                    icon: '#F59E0B',
                    button: '#D97706',
                    buttonHover: '#B45309',
                    bg: '#FFFBEB',
                    border: '#FDE68A'
                };
            default:
                return {
                    icon: '#3B82F6',
                    button: '#2563EB',
                    buttonHover: '#1D4ED8',
                    bg: '#EFF6FF',
                    border: '#BFDBFE'
                };
        }
    };

    const colors = getColors();

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
                opacity: isVisible ? 1 : 0,
                transition: 'opacity 0.2s'
            }}
            onClick={handleCancel}
        >
            <div
                style={{
                    backgroundColor: 'white',
                    borderRadius: '16px',
                    padding: '24px',
                    maxWidth: '400px',
                    width: '90%',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                    transform: isVisible ? 'scale(1)' : 'scale(0.95)',
                    transition: 'transform 0.2s'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', alignItems: 'start', gap: '16px', marginBottom: '20px' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        backgroundColor: colors.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}>
                        <AlertTriangle size={24} color={colors.icon} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '8px', color: '#111827' }}>
                            {title}
                        </h3>
                        <p style={{ color: '#6B7280', lineHeight: '1.6' }}>
                            {message}
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                        onClick={handleCancel}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '8px',
                            border: '1px solid #D1D5DB',
                            backgroundColor: 'white',
                            color: '#374151',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '0.95rem'
                        }}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={handleConfirm}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: colors.button,
                            color: 'white',
                            fontWeight: '600',
                            cursor: 'pointer',
                            fontSize: '0.95rem'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = colors.buttonHover;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = colors.button;
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Hook for easy confirmation
export function useConfirm() {
    const [dialog, setDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        confirmText?: string;
        cancelText?: string;
        onConfirm: () => void;
        onCancel: () => void;
        type?: 'danger' | 'warning' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
        onCancel: () => {}
    });

    const confirm = (
        message: string,
        title: string = 'Подтверждение',
        type: 'danger' | 'warning' | 'info' = 'warning'
    ): Promise<boolean> => {
        return new Promise((resolve) => {
            setDialog({
                isOpen: true,
                title,
                message,
                type,
                onConfirm: () => {
                    setDialog(prev => ({ ...prev, isOpen: false }));
                    resolve(true);
                },
                onCancel: () => {
                    setDialog(prev => ({ ...prev, isOpen: false }));
                    resolve(false);
                }
            });
        });
    };

    const Dialog = () => (
        <ConfirmDialog
            isOpen={dialog.isOpen}
            title={dialog.title}
            message={dialog.message}
            confirmText={dialog.confirmText}
            cancelText={dialog.cancelText}
            type={dialog.type}
            onConfirm={dialog.onConfirm}
            onCancel={dialog.onCancel}
        />
    );

    return { confirm, Dialog };
}
