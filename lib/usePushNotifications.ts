'use client';

import { useState, useEffect, useCallback } from 'react';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export function usePushNotifications() {
    const [isSupported, setIsSupported] = useState(false);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setIsSupported('serviceWorker' in navigator && 'PushManager' in window);

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').then(async (registration) => {
                const subscription = await registration.pushManager.getSubscription();
                setIsSubscribed(!!subscription);
            }).catch(() => {});
        }
    }, []);

    const subscribe = useCallback(async () => {
        if (!isSupported) return false;
        setIsLoading(true);

        try {
            const registration = await navigator.serviceWorker.ready;

            const res = await fetch('/api/push/vapid-key');
            if (!res.ok) return false;
            const { publicKey } = await res.json();

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer,
            });

            const subJson = subscription.toJSON();
            const saveRes = await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    endpoint: subJson.endpoint,
                    keys: subJson.keys,
                }),
            });

            if (saveRes.ok) {
                setIsSubscribed(true);
                return true;
            }
            return false;
        } catch {
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [isSupported]);

    const unsubscribe = useCallback(async () => {
        setIsLoading(true);
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                await fetch('/api/push/subscribe', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ endpoint: subscription.endpoint }),
                });
                await subscription.unsubscribe();
            }

            setIsSubscribed(false);
            return true;
        } catch {
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return { isSupported, isSubscribed, isLoading, subscribe, unsubscribe };
}
