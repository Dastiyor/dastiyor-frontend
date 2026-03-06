/**
 * Email Notification Service
 *
 * Uses Brevo (formerly Sendinblue) when BREVO_API_KEY is set.
 * Set BREVO_FROM_EMAIL (and optionally BREVO_FROM_NAME) to a verified sender in Brevo.
 */

import { BrevoClient } from '@getbrevo/brevo';

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

let brevoClient: BrevoClient | null = null;

function getBrevoClient(): BrevoClient | null {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) return null;
    if (!brevoClient) {
        brevoClient = new BrevoClient({ apiKey });
    }
    return brevoClient;
}

function getSender(): { name: string; email: string } {
    const email = process.env.BREVO_FROM_EMAIL || process.env.EMAIL_FROM;
    const name = process.env.BREVO_FROM_NAME || 'Dastiyor';
    if (!email) {
        console.warn('Brevo: Set BREVO_FROM_EMAIL (or EMAIL_FROM) to a verified sender in Brevo.');
        return { name, email: 'noreply@example.com' }; // Brevo may reject if not verified
    }
    return { name, email };
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
    try {
        const api = getBrevoClient();

        if (!api) {
            if (process.env.NODE_ENV === 'development') {
                console.log('='.repeat(60));
                console.log('EMAIL NOTIFICATION (No Brevo API key):');
                console.log('To:', options.to);
                console.log('Subject:', options.subject);
                console.log('Body:', options.text || options.html);
                console.log('='.repeat(60));
                return true;
            }
            console.warn('Email: BREVO_API_KEY not set. Configure in .env');
            return false;
        }

        const sender = getSender();
        await api.transactionalEmails.sendTransacEmail({
            sender,
            subject: options.subject,
            htmlContent: options.html,
            textContent: options.text || options.html,
            to: [{ email: options.to }],
        });
        return true;
    } catch (error) {
        console.error('Email sending error:', error);
        return false;
    }
}

export async function sendPasswordResetEmail(email: string, resetLink: string): Promise<boolean> {
    return sendEmail({
        to: email,
        subject: 'Сброс пароля - Dastiyor',
        html: `
            <h2>Сброс пароля</h2>
            <p>Вы запросили сброс пароля для вашего аккаунта на Dastiyor.</p>
            <p>Нажмите на ссылку ниже, чтобы сбросить пароль:</p>
            <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">
                Сбросить пароль
            </a>
            <p>Ссылка действительна в течение 1 часа.</p>
            <p>Если вы не запрашивали сброс пароля, проигнорируйте это письмо.</p>
        `,
        text: `Сброс пароля - Dastiyor\n\nПерейдите по ссылке для сброса пароля: ${resetLink}\n\nСсылка действительна в течение 1 часа.`,
    });
}

export async function sendTaskResponseNotification(
    email: string,
    taskTitle: string,
    providerName: string,
    price: string,
    taskLink: string
): Promise<boolean> {
    return sendEmail({
        to: email,
        subject: `Новое предложение на задание "${taskTitle}"`,
        html: `
            <h2>Новое предложение</h2>
            <p>На ваше задание "${taskTitle}" поступило новое предложение от ${providerName}.</p>
            <p><strong>Предложенная цена:</strong> ${price} с.</p>
            <a href="${taskLink}" style="display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">
                Посмотреть предложение
            </a>
        `,
        text: `Новое предложение на задание "${taskTitle}" от ${providerName}. Цена: ${price} с. Ссылка: ${taskLink}`,
    });
}

export async function sendOfferAcceptedNotification(
    email: string,
    taskTitle: string,
    taskLink: string
): Promise<boolean> {
    return sendEmail({
        to: email,
        subject: `Ваш отклик принят - "${taskTitle}"`,
        html: `
            <h2>Отклик принят!</h2>
            <p>Вас выбрали исполнителем задания "${taskTitle}".</p>
            <p>Свяжитесь с заказчиком для обсуждения деталей.</p>
            <a href="${taskLink}" style="display: inline-block; padding: 12px 24px; background-color: #22c55e; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">
                Открыть задание
            </a>
        `,
        text: `Ваш отклик на задание "${taskTitle}" был принят. Свяжитесь с заказчиком. Ссылка: ${taskLink}`,
    });
}
