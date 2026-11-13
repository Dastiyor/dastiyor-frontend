import { NextResponse } from 'next/server';
import { getPublicProfile } from '@/lib/professionals';
import { trackProfileApiView } from '@/lib/profile-views';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = await getPublicProfile(id);
        if (!user) {
            return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
        }
        if (user.role === 'PROVIDER') trackProfileApiView(request, id); // after the response; never throws
        return NextResponse.json({ user });
    } catch (error) {
        console.error('Get User Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
