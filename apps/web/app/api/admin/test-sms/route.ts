import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { sendSMS } from '@/lib/brevo-sms';

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifyJWT(token);
        if (!payload || payload.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const { phone, message } = body;

        if (!phone || !message) {
            return NextResponse.json(
                { error: 'Phone and message are required' },
                { status: 400 }
            );
        }

        // Normalize to E.164: strip spaces, ensure leading +
        const recipient = phone.replace(/\s/g, '').replace(/^(\d)/, '+$1');
        const result = await sendSMS({ recipient, body: message });

        return NextResponse.json({ success: true, data: result });
    } catch (error: any) {
        console.error('Test SMS Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to send SMS' },
            { status: 500 }
        );
    }
}
