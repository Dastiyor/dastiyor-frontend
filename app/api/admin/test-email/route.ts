import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT } from '@/lib/auth';
import { sendEmail } from '@/lib/notifications/email';

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
        const { to } = body;

        if (!to || typeof to !== 'string') {
            return NextResponse.json(
                { error: 'Recipient email (to) is required' },
                { status: 400 }
            );
        }

        const result = await sendEmail({
            to: to.trim(),
            subject: 'Dastiyor – тестовое письмо',
            html: `
                <h2>Тестовое письмо</h2>
                <p>Если вы получили это письмо, интеграция Brevo работает.</p>
                <p>Отправлено из панели администратора Dastiyor.</p>
            `,
            text: 'Тестовое письмо. Интеграция Brevo работает. Отправлено из панели администратора Dastiyor.',
        });

        if (!result) {
            return NextResponse.json(
                { error: 'Failed to send email. Check BREVO_API_KEY and BREVO_FROM_EMAIL.' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true, message: 'Email sent' });
    } catch (error: unknown) {
        console.error('Test Email Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to send email' },
            { status: 500 }
        );
    }
}
