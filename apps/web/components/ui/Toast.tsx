'use client';

import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

let toastIdCounter = 0;
const toastListeners: Array<(toasts: Toast[]) => void> = [];
let toasts: Toast[] = [];

function notify() {
    toastListeners.forEach(listener => listener([...toasts]));
}

export function showToast(message: string, type: ToastType = 'info', duration: number = 5000) {
    const id = `toast-${++toastIdCounter}`;
    const toast: Toast = { id, message, type, duration };
    toasts = [...toasts, toast];
    notify();

    if (duration > 0) {
        setTimeout(() => {
            removeToast(id);
        }, duration);
    }

    return id;
}

export function removeToast(id: string) {
    toasts = toasts.filter(t => t.id !== id);
    notify();
}

export function clearToasts() {
    toasts = [];
    notify();
}

export function ToastContainer() {
    const [toastList, setToastList] = useState<Toast[]>(() => [...toasts]);

    useEffect(() => {
        const listener = (newToasts: Toast[]) => {
            setToastList(newToasts);
        };
        toastListeners.push(listener);

        return () => {
            const index = toastListeners.indexOf(listener);
            if (index > -1) {
                toastListeners.splice(index, 1);
            }
        };
    }, []);

    if (toastList.length === 0) return null;

    return (
        <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 10000,
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            maxWidth: '400px'
        }}>
            {toastList.map((toast) => (
                <ToastItem key={toast.id} toast={toast} />
            ))}
        </div>
    );
}

function ToastItem({ toast }: { toast: Toast }) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Trigger animation
        setTimeout(() => setIsVisible(true), 10);
    }, []);

    const getToastStyles = () => {
        const baseStyles = {
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 20px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            backgroundColor: 'white',
            border: '1px solid',
            minWidth: '300px',
            maxWidth: '400px',
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
            transition: 'all 0.3s ease',
        };

        switch (toast.type) {
            case 'success':
                return { ...baseStyles, borderColor: '#10B981', backgroundColor: '#F0FDF4' };
            case 'error':
                return { ...baseStyles, borderColor: '#EF4444', backgroundColor: '#FEF2F2' };
            case 'warning':
                return { ...baseStyles, borderColor: '#F59E0B', backgroundColor: '#FFFBEB' };
            default:
                return { ...baseStyles, borderColor: '#3B82F6', backgroundColor: '#EFF6FF' };
        }
    };

    const getIcon = () => {
        const iconSize = 20;
        switch (toast.type) {
            case 'success':
                return <CheckCircle size={iconSize} color="#10B981" />;
            case 'error':
                return <AlertCircle size={iconSize} color="#EF4444" />;
            case 'warning':
                return <AlertTriangle size={iconSize} color="#F59E0B" />;
            default:
                return <Info size={iconSize} color="#3B82F6" />;
        }
    };

    return (
        <div style={getToastStyles()}>
            {getIcon()}
            <div style={{ flex: 1, fontSize: '0.95rem', color: '#111827' }}>
                {toast.message}
            </div>
            <button
                onClick={() => removeToast(toast.id)}
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    color: '#6B7280'
                }}
            >
                <X size={18} />
            </button>
        </div>
    );
}

// Convenience functions
export const toast = {
    success: (message: string, duration?: number) => showToast(message, 'success', duration),
    error: (message: string, duration?: number) => showToast(message, 'error', duration),
    info: (message: string, duration?: number) => showToast(message, 'info', duration),
    warning: (message: string, duration?: number) => showToast(message, 'warning', duration),
};

// Confirmation dialog replacement
export function confirmAction(
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
): void {
    if (typeof window !== 'undefined' && window.confirm) {
        if (window.confirm(message)) {
            onConfirm();
        } else {
            onCancel?.();
        }
    }
}
