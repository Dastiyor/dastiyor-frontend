/**
 * Email Notification Service
 *
 * Uses Brevo (formerly Sendinblue) when BREVO_API_KEY is set.
 * Set BREVO_FROM_EMAIL (and optionally BREVO_FROM_NAME) to a verified sender in Brevo.
 *
 * All emails share a single branded layout (header + logo / body / footer) via
 * `emailLayout()`. Each notification only supplies its heading, body paragraphs
 * and an optional call-to-action button. Dynamic, user-supplied values are
 * HTML-escaped with `esc()` before interpolation.
 */

import { BrevoClient } from '@getbrevo/brevo';

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

// ---------------------------------------------------------------------------
// Brand constants
// ---------------------------------------------------------------------------

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://dastiyor.com';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@dastiyor.com';
const BRAND = {
    primary: '#2563EB',
    success: '#16A34A',
    danger: '#EF4444',
    amber: '#F59E0B',
};

// ---------------------------------------------------------------------------
// Template helpers
// ---------------------------------------------------------------------------

/** Escape HTML-significant characters in user-supplied values. */
function esc(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** A standard body paragraph. */
function p(html: string): string {
    return `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#374151;">${html}</p>`;
}

/** A bulletproof-ish CTA button. */
function button(label: string, url: string, color: string = BRAND.primary): string {
    return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td style="border-radius:8px;background:${color};">
          <a href="${url}" style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">${label}</a>
        </td>
      </tr>
    </table>`;
}

interface LayoutOptions {
    heading: string;
    body: string;
    cta?: { label: string; url: string; color?: string };
    /** Hidden preheader text shown in the inbox preview line. */
    preview?: string;
}

/** Wrap inner content in the shared header/body/footer shell. */
function emailLayout({ heading, body, cta, preview }: LayoutOptions): string {
    const year = new Date().getFullYear();
    const ctaHtml = cta ? button(cta.label, cta.url, cta.color) : '';
    const previewHtml = preview
        ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${esc(preview)}</div>`
        : '';

    return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>Dastiyor</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  ${previewHtml}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#ffffff;padding:24px 32px;text-align:center;border-bottom:1px solid #eef0f2;">
              <img src="${APP_URL}/logo.png" alt="Dastiyor" width="44" height="44" style="display:inline-block;vertical-align:middle;width:44px;height:44px;border:0;border-radius:10px;">
              <span style="display:inline-block;vertical-align:middle;margin-left:10px;font-size:22px;font-weight:800;color:${BRAND.primary};letter-spacing:-0.5px;">Dastiyor</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111827;">${heading}</h1>
              ${body}
              ${ctaHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px;background:#f9fafb;border-top:1px solid #eef0f2;color:#9ca3af;font-size:12px;line-height:1.6;">
              <p style="margin:0 0 4px;">Dastiyor — онлайн-маркетплейс услуг в Таджикистане.</p>
              <p style="margin:0 0 4px;">Нужна помощь? <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND.primary};text-decoration:none;">${SUPPORT_EMAIL}</a></p>
              <p style="margin:8px 0 0;color:#c4c8cf;">© ${year} Dastiyor. Это автоматическое письмо — отвечать на него не нужно.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export async function sendPasswordResetEmail(email: string, resetLink: string): Promise<boolean> {
    return sendEmail({
        to: email,
        subject: 'Сброс пароля — Dastiyor',
        html: emailLayout({
            heading: 'Сброс пароля',
            preview: 'Ссылка для сброса пароля действительна 1 час.',
            body:
                p('Вы запросили сброс пароля для вашего аккаунта на Dastiyor.') +
                p('Нажмите на кнопку ниже, чтобы задать новый пароль. Ссылка действительна в течение 1 часа.') +
                p('Если вы не запрашивали сброс пароля, просто проигнорируйте это письмо.'),
            cta: { label: 'Сбросить пароль', url: resetLink },
        }),
        text: `Сброс пароля - Dastiyor\n\nПерейдите по ссылке для сброса пароля: ${resetLink}\n\nСсылка действительна в течение 1 часа.`,
    });
}

export async function sendPasswordResetCodeEmail(email: string, code: string): Promise<boolean> {
    return sendEmail({
        to: email,
        subject: 'Сброс пароля — Dastiyor',
        html: emailLayout({
            heading: 'Сброс пароля',
            preview: `Ваш код: ${code}`,
            body:
                p('Вы запросили сброс пароля для вашего аккаунта на Dastiyor.') +
                p('Введите этот код в приложении:') +
                `<div style="font-size:34px;font-weight:700;letter-spacing:8px;text-align:center;padding:22px;background:#f3f4f6;border-radius:8px;margin:8px 0 16px;color:#111827;">${esc(code)}</div>` +
                p('Код действителен в течение 15 минут. Если вы не запрашивали сброс пароля, проигнорируйте это письмо.'),
        }),
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
        html: emailLayout({
            heading: 'Новое предложение',
            preview: `${providerName} предложил ${price} с.`,
            body:
                p(`На ваше задание «<strong>${esc(taskTitle)}</strong>» поступило новое предложение от <strong>${esc(providerName)}</strong>.`) +
                p(`Предложенная цена: <strong>${esc(price)} с.</strong>`),
            cta: { label: 'Посмотреть предложение', url: taskLink },
        }),
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
        subject: `Ваш отклик принят — "${taskTitle}"`,
        html: emailLayout({
            heading: 'Отклик принят!',
            preview: `Вас выбрали исполнителем задания "${taskTitle}".`,
            body:
                p(`Вас выбрали исполнителем задания «<strong>${esc(taskTitle)}</strong>».`) +
                p('Свяжитесь с заказчиком, чтобы обсудить детали.'),
            cta: { label: 'Открыть задание', url: taskLink, color: BRAND.success },
        }),
        text: `Ваш отклик на задание "${taskTitle}" был принят. Свяжитесь с заказчиком. Ссылка: ${taskLink}`,
    });
}

export async function sendTaskCompletedNotification(
    email: string,
    taskTitle: string,
    taskLink: string,
    earnings?: string
): Promise<boolean> {
    const earningsLine = earnings ? p(`Баланс пополнен на: <strong>${esc(earnings)} с.</strong>`) : '';
    return sendEmail({
        to: email,
        subject: `Задание выполнено — "${taskTitle}"`,
        html: emailLayout({
            heading: 'Задание выполнено!',
            preview: `Заказчик подтвердил выполнение задания "${taskTitle}".`,
            body:
                p(`Заказчик подтвердил выполнение задания «<strong>${esc(taskTitle)}</strong>».`) +
                earningsLine,
            cta: { label: 'Посмотреть задание', url: taskLink, color: BRAND.success },
        }),
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
        subject: `Отклик отклонён — "${taskTitle}"`,
        html: emailLayout({
            heading: 'Отклик отклонён',
            preview: `Ваш отклик на задание "${taskTitle}" был отклонён.`,
            body:
                p(`К сожалению, ваш отклик на задание «<strong>${esc(taskTitle)}</strong>» был отклонён заказчиком.`) +
                p('Не расстраивайтесь — на платформе есть множество других заданий!'),
            cta: { label: 'Найти задания', url: taskLink },
        }),
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
        html: emailLayout({
            heading: 'Новое сообщение',
            preview: `${senderName}: ${preview}`,
            body:
                p(`<strong>${esc(senderName)}</strong> отправил(а) вам сообщение:`) +
                `<blockquote style="border-left:3px solid ${BRAND.primary};padding:8px 16px;margin:0 0 16px;color:#555;font-size:15px;line-height:1.6;">${esc(preview)}</blockquote>`,
            cta: { label: 'Ответить', url: chatLink },
        }),
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
    const commentLine = comment
        ? `<blockquote style="border-left:3px solid ${BRAND.amber};padding:8px 16px;margin:0 0 16px;color:#555;font-size:15px;line-height:1.6;">${esc(comment)}</blockquote>`
        : '';
    return sendEmail({
        to: email,
        subject: `Новый отзыв от ${reviewerName} — ${stars}`,
        html: emailLayout({
            heading: 'Новый отзыв',
            preview: `${reviewerName} оценил вас на ${rating}/5.`,
            body:
                p(`<strong>${esc(reviewerName)}</strong> оставил(а) отзыв за задание «<strong>${esc(taskTitle)}</strong>».`) +
                `<p style="margin:0 0 12px;font-size:24px;color:${BRAND.amber};">${stars}</p>` +
                commentLine,
            cta: { label: 'Посмотреть профиль', url: profileLink },
        }),
        text: `Новый отзыв от ${reviewerName} за задание "${taskTitle}". Оценка: ${rating}/5.${comment ? ` Комментарий: ${comment}` : ''} Ссылка: ${profileLink}`,
    });
}

export async function sendWelcomeEmail(
    email: string,
    fullName: string,
    role: string
): Promise<boolean> {
    const dashboardUrl = role === 'PROVIDER' ? `${APP_URL}/provider` : `${APP_URL}/customer`;
    const roleText = role === 'PROVIDER' ? 'исполнителя' : 'заказчика';
    return sendEmail({
        to: email,
        subject: 'Добро пожаловать на Dastiyor!',
        html: emailLayout({
            heading: `Добро пожаловать, ${esc(fullName)}!`,
            preview: 'Ваш аккаунт на Dastiyor готов.',
            body:
                p(`Вы успешно зарегистрировались на Dastiyor как <strong>${roleText}</strong>.`) +
                p(role === 'PROVIDER'
                    ? 'Теперь вы можете находить задания и предлагать свои услуги.'
                    : 'Теперь вы можете размещать задания и находить исполнителей.'),
            cta: { label: 'Перейти в личный кабинет', url: dashboardUrl },
        }),
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
    const row = (label: string, value: string, opts: { bold?: boolean; big?: boolean; last?: boolean } = {}) => `
        <tr${opts.last ? '' : ' style="border-bottom:1px solid #e5e7eb;"'}>
            <td style="padding:12px 0;color:#6b7280;font-size:14px;">${label}</td>
            <td style="padding:12px 0;text-align:right;font-size:${opts.big ? '1.2em' : '14px'};font-weight:${opts.bold ? 700 : 400};color:${opts.big ? '#166534' : '#111827'};">${value}</td>
        </tr>`;
    return sendEmail({
        to: email,
        subject: `Чек оплаты — ${amount} с. — Dastiyor`,
        html: emailLayout({
            heading: 'Оплата прошла успешно!',
            preview: `Чек на ${amount} с.`,
            body:
                p(`Здравствуйте, <strong>${esc(fullName)}</strong>! Ваш платёж был успешно обработан.`) +
                `<table role="presentation" style="width:100%;border-collapse:collapse;margin:8px 0 8px;">
                    ${row('Описание', esc(description))}
                    ${row('Сумма', `${amount} с.`, { bold: true, big: true })}
                    ${row('Номер заказа', esc(orderId))}
                    ${row('ID транзакции', esc(transactionId), { last: true })}
                </table>`,
            cta: { label: 'История платежей', url: `${APP_URL}/provider/payment-history` },
        }),
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
        subject: `Задание отменено — "${taskTitle}"`,
        html: emailLayout({
            heading: 'Задание отменено',
            preview: `Задание "${taskTitle}" было отменено заказчиком.`,
            body:
                p(`Задание «<strong>${esc(taskTitle)}</strong>», на которое вы откликнулись, было отменено заказчиком.`) +
                p('Посмотрите другие доступные задания на платформе.'),
            cta: { label: 'Найти задания', url: browseLink },
        }),
        text: `Задание "${taskTitle}" было отменено заказчиком. Найдите другие задания: ${browseLink}`,
    });
}
