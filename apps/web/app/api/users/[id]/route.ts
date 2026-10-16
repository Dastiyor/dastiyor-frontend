import { NextResponse } from 'next/server';
import { getPublicProfile } from '@/lib/professionals';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = await getPublicProfile(id);
        if (!user) {
            return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
        }
        return NextResponse.json({ user });
    } catch (error) {
        console.error('Get User Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
