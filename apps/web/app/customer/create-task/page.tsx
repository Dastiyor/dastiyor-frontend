'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CustomerCreateTaskPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/create-task');
    }, [router]);

    return null;
}
