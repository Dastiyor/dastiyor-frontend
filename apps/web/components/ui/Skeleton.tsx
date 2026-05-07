'use client';

import { CSSProperties } from 'react';

export function Skeleton({ width, height, borderRadius = '8px', style }: {
    width?: string | number;
    height?: string | number;
    borderRadius?: string;
    style?: CSSProperties;
}) {
    return (
        <div
            style={{
                width: width || '100%',
                height: height || '20px',
                borderRadius,
                backgroundColor: '#E5E7EB',
                animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                ...style
            }}
        />
    );
}

export function TaskCardSkeleton() {
    return (
        <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #E5E7EB'
        }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <Skeleton width="80px" height="24px" />
                <Skeleton width="60px" height="24px" />
            </div>
            <Skeleton height="24px" width="70%" style={{ marginBottom: '12px' }} />
            <Skeleton height="60px" style={{ marginBottom: '16px' }} />
            <div style={{ display: 'flex', gap: '20px' }}>
                <Skeleton width="100px" height="16px" />
                <Skeleton width="100px" height="16px" />
                <Skeleton width="100px" height="16px" />
            </div>
        </div>
    );
}

export function ResponseSkeleton() {
    return (
        <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #E5E7EB'
        }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <Skeleton width="40px" height="40px" borderRadius="50%" />
                <div style={{ flex: 1 }}>
                    <Skeleton width="150px" height="20px" style={{ marginBottom: '8px' }} />
                    <Skeleton width="100px" height="16px" />
                </div>
            </div>
            <Skeleton height="60px" style={{ marginBottom: '16px' }} />
            <Skeleton width="120px" height="36px" />
        </div>
    );
}
