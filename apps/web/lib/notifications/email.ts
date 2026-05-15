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

export async function sendPasswordResetCodeEmail(email: string, code: string): Promise<boolean> {
    return sendEmail({
        to: email,
        subject: 'Сброс пароля - Dastiyor',
        html: `
            <h2>Сброс пароля</h2>
            <p>Вы запросили сброс пароля для вашего аккаунта на Dastiyor.</p>
            <p>Введите следующий код в приложении:</p>
            <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 24px; background: #F3F4F6; border-radius: 8px; margin: 16px 0;">
                ${code}
            </div>
            <p>Код действителен в течение 15 минут.</p>
            <p>Если вы не запрашивали сброс пароля, проигнорируйте это письмо.</p>
        `,
        text: `Сброс пароля - Dastiyor\n\nВаш код для сброса пароля: ${code}\n\nКод действителен в течение 15 минут.`,
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

export async function sendTaskCompletedNotification(
    email: string,
    taskTitle: string,
    taskLink: string,
    earnings?: string
): Promise<boolean> {
    const earningsLine = earnings ? `<p><strong>Баланс пополнен на:</strong> ${earnings} с.</p>` : '';
    return sendEmail({
        to: email,
        subject: `Задание выполнено - "${taskTitle}"`,
        html: `
            <h2>Задание выполнено!</h2>
            <p>Заказчик подтвердил выполнение задания "${taskTitle}".</p>
            ${earningsLine}
            <a href="${taskLink}" style="display: inline-block; padding: 12px 24px; background-color: #22c55e; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">
                Посмотреть задание
            </a>
        `,
        text: `Задание "${taskTitle}" выполнено.${earnings ? ` Баланс пополнен на ${earnings} с.` : ''} Ссылка: ${taskLink}`,
    });
}

export async function sendOfferRejectedNotification(
    email: string,
    taskTitle: string,
    taskLink: string
): Promise<boolean> {
    return sendEmail({
        to: email,
        subject: `Отклик отклонен - "${taskTitle}"`,
        html: `
            <h2>Отклик отклонен</h2>
            <p>К сожалению, ваш отклик на задание "${taskTitle}" был отклонен заказчиком.</p>
            <p>Не расстраивайтесь — на платформе есть множество других заданий!</p>
            <a href="${taskLink}" style="display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">
                Найти задания
            </a>
        `,
        text: `Ваш отклик на задание "${taskTitle}" был отклонен. Ссылка: ${taskLink}`,
    });
}

export async function sendNewMessageNotification(
    email: string,
    senderName: string,
    messagePreview: string,
    chatLink: string
): Promise<boolean> {
    const preview = messagePreview.length > 100 ? messagePreview.substring(0, 100) + '...' : messagePreview;
    return sendEmail({
        to: email,
        subject: `Новое сообщение от ${senderName}`,
        html: `
            <h2>Новое сообщение</h2>
            <p><strong>${senderName}</strong> отправил(а) вам сообщение:</p>
            <blockquote style="border-left: 3px solid #3B82F6; padding: 8px 16px; margin: 16px 0; color: #555;">${preview}</blockquote>
            <a href="${chatLink}" style="display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">
                Ответить
            </a>
        `,
        text: `Новое сообщение от ${senderName}: "${preview}". Ссылка: ${chatLink}`,
    });
}

export async function sendNewReviewNotification(
    email: string,
    reviewerName: string,
    taskTitle: string,
    rating: number,
    comment: string | null,
    profileLink: string
): Promise<boolean> {
    const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
    const commentLine = comment ? `<blockquote style="border-left: 3px solid #f59e0b; padding: 8px 16px; margin: 16px 0; color: #555;">${comment}</blockquote>` : '';
    return sendEmail({
        to: email,
        subject: `Новый отзыв от ${reviewerName} - ${stars}`,
        html: `
            <h2>Новый отзыв</h2>
            <p><strong>${reviewerName}</strong> оставил(а) отзыв за задание "${taskTitle}".</p>
            <p style="font-size: 24px; color: #f59e0b;">${stars}</p>
            ${commentLine}
            <a href="${profileLink}" style="display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">
                Посмотреть профиль
            </a>
        `,
        text: `Новый отзыв от ${reviewerName} за задание "${taskTitle}". Оценка: ${rating}/5.${comment ? ` Комментарий: ${comment}` : ''} Ссылка: ${profileLink}`,
    });
}

export async function sendWelcomeEmail(
    email: string,
    fullName: string,
    role: string
): Promise<boolean> {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dastiyor.com';
    const dashboardUrl = role === 'PROVIDER' ? `${baseUrl}/provider` : `${baseUrl}/customer`;
    const roleText = role === 'PROVIDER' ? 'исполнителя' : 'заказчика';
    return sendEmail({
        to: email,
        subject: 'Добро пожаловать на Dastiyor!',
        html: `
            <h2>Добро пожаловать, ${fullName}!</h2>
            <p>Вы успешно зарегистрировались на Dastiyor как ${roleText}.</p>
            <p>${role === 'PROVIDER'
                ? 'Теперь вы можете находить задания и предлагать свои услуги.'
                : 'Теперь вы можете размещать задания и находить исполнителей.'}</p>
            <a href="${dashboardUrl}" style="display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">
                Перейти в личный кабинет
            </a>
        `,
        text: `Добро пожаловать на Dastiyor, ${fullName}! Вы зарегистрированы как ${roleText}. Ссылка: ${dashboardUrl}`,
    });
}

export async function sendPaymentReceiptEmail(
    email: string,
    fullName: string,
    amount: number,
    description: string,
    orderId: string,
    transactionId: string
): Promise<boolean> {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dastiyor.com';
    return sendEmail({
        to: email,
        subject: `Чек оплаты — ${amount} с. — Dastiyor`,
        html: `
            <h2>Оплата прошла успешно!</h2>
            <p>Здравствуйте, ${fullName}!</p>
            <p>Ваш платёж был успешно обработан.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
                <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 12px 0; color: #6b7280;">Описание</td>
                    <td style="padding: 12px 0; text-align: right; font-weight: 600;">${description}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 12px 0; color: #6b7280;">Сумма</td>
                    <td style="padding: 12px 0; text-align: right; font-weight: 700; font-size: 1.2em; color: #166534;">${amount} с.</td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 12px 0; color: #6b7280;">Номер заказа</td>
                    <td style="padding: 12px 0; text-align: right;">${orderId}</td>
                </tr>
                <tr>
                    <td style="padding: 12px 0; color: #6b7280;">ID транзакции</td>
                    <td style="padding: 12px 0; text-align: right;">${transactionId}</td>
                </tr>
            </table>
            <a href="${baseUrl}/provider/payment-history" style="display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">
                История платежей
            </a>
            <p style="font-size: 0.85rem; color: #9ca3af; margin-top: 24px;">Если у вас есть вопросы по платежу, свяжитесь с нашей службой поддержки.</p>
        `,
        text: `Оплата прошла успешно! ${description}. Сумма: ${amount} с. Заказ: ${orderId}. Транзакция: ${transactionId}.`,
    });
}

export async function sendTaskCancelledNotification(
    email: string,
    taskTitle: string,
    browseLink: string
): Promise<boolean> {
    return sendEmail({
        to: email,
        subject: `Задание отменено - "${taskTitle}"`,
        html: `
            <h2>Задание отменено</h2>
            <p>Задание "${taskTitle}", на которое вы откликнулись, было отменено заказчиком.</p>
            <p>Посмотрите другие доступные задания на платформе.</p>
            <a href="${browseLink}" style="display: inline-block; padding: 12px 24px; background-color: #3B82F6; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">
                Найти задания
            </a>
        `,
        text: `Задание "${taskTitle}" было отменено заказчиком. Найдите другие задания: ${browseLink}`,
    });
}
