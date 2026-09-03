import { emailStrings } from './email-strings';
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

export async function sendPasswordResetEmail(
    email: string,
    resetLink: string,
    locale?: string | null
): Promise<boolean> {
    const t = emailStrings(locale).passwordReset;
    const a = { link: resetLink };
    return sendEmail({
        to: email,
        subject: t.subject(a),
        html: emailLayout({
            heading: t.heading,
            preview: t.preview(a),
            body: t.body(a).map((line) => p(esc(line))).join(''),
            cta: { label: t.cta, url: resetLink },
        }),
        text: t.text(a),
    });
}

export async function sendPasswordResetCodeEmail(
    email: string,
    code: string,
    locale?: string | null
): Promise<boolean> {
    const t = emailStrings(locale).passwordResetCode;
    const a = { code };
    return sendEmail({
        to: email,
        subject: t.subject(a),
        html: emailLayout({
            heading: t.heading,
            preview: t.preview(a),
            body: t.body(a).map((line) => p(esc(line))).join(''),
        }),
        text: t.text(a),
    });
}

export async function sendTaskResponseNotification(
    email: string,
    taskTitle: string,
    providerName: string,
    price: string,
    taskLink: string,
    locale?: string | null
): Promise<boolean> {
    const t = emailStrings(locale).taskResponse;
    const a = { task: taskTitle, provider: providerName, price, link: taskLink };
    return sendEmail({
        to: email,
        subject: t.subject(a),
        html: emailLayout({
            heading: t.heading,
            preview: t.preview(a),
            body: t.body(a).map((line) => p(esc(line))).join(''),
            cta: { label: t.cta, url: taskLink },
        }),
        text: t.text(a),
    });
}

export async function sendOfferAcceptedNotification(
    email: string,
    taskTitle: string,
    taskLink: string,
    locale?: string | null
): Promise<boolean> {
    const t = emailStrings(locale).offerAccepted;
    const a = { task: taskTitle, link: taskLink };
    return sendEmail({
        to: email,
        subject: t.subject(a),
        html: emailLayout({
            heading: t.heading,
            preview: t.preview(a),
            body: t.body(a).map((line) => p(esc(line))).join(''),
            cta: { label: t.cta, url: taskLink, color: BRAND.success },
        }),
        text: t.text(a),
    });
}

export async function sendTaskCompletedNotification(
    email: string,
    taskTitle: string,
    taskLink: string,
    earnings?: string,
    locale?: string | null
): Promise<boolean> {
    const t = emailStrings(locale).taskCompleted;
    const a = { task: taskTitle, link: taskLink, earnings: earnings ?? '' };
    return sendEmail({
        to: email,
        subject: t.subject(a),
        html: emailLayout({
            heading: t.heading,
            preview: t.preview(a),
            body: t.body(a).map((line) => p(esc(line))).join(''),
            cta: { label: t.cta, url: taskLink, color: BRAND.success },
        }),
        text: t.text(a),
    });
}

export async function sendOfferRejectedNotification(
    email: string,
    taskTitle: string,
    taskLink: string,
    locale?: string | null
): Promise<boolean> {
    const t = emailStrings(locale).offerRejected;
    const a = { task: taskTitle, link: taskLink };
    return sendEmail({
        to: email,
        subject: t.subject(a),
        html: emailLayout({
            heading: t.heading,
            preview: t.preview(a),
            body: t.body(a).map((line) => p(esc(line))).join(''),
            cta: { label: t.cta, url: taskLink },
        }),
        text: t.text(a),
    });
}

export async function sendNewMessageNotification(
    email: string,
    senderName: string,
    messagePreview: string,
    chatLink: string,
    locale?: string | null
): Promise<boolean> {
    const t = emailStrings(locale).newMessage;
    const a = { sender: senderName, excerpt: messagePreview, link: chatLink };
    return sendEmail({
        to: email,
        subject: t.subject(a),
        html: emailLayout({
            heading: t.heading,
            preview: t.preview(a),
            body: t.body(a).map((line) => p(esc(line))).join(''),
            cta: { label: t.cta, url: chatLink },
        }),
        text: t.text(a),
    });
}

export async function sendNewReviewNotification(
    email: string,
    reviewerName: string,
    taskTitle: string,
    rating: number,
    comment: string | null,
    profileLink: string,
    locale?: string | null
): Promise<boolean> {
    const t = emailStrings(locale).newReview;
    const a = { reviewer: reviewerName, task: taskTitle, rating: String(rating), comment: comment ?? '', link: profileLink };
    return sendEmail({
        to: email,
        subject: t.subject(a),
        html: emailLayout({
            heading: t.heading,
            preview: t.preview(a),
            body: t.body(a).map((line) => p(esc(line))).join(''),
            cta: { label: t.cta, url: profileLink },
        }),
        text: t.text(a),
    });
}

export async function sendWelcomeEmail(
    email: string,
    fullName: string,
    role: string,
    locale?: string | null
): Promise<boolean> {
    const dashboardUrl = role === 'PROVIDER' ? `${APP_URL}/provider` : `${APP_URL}/customer`;
    const t = emailStrings(locale).welcome;
    const a = { name: fullName, link: dashboardUrl };
    return sendEmail({
        to: email,
        subject: t.subject(a),
        html: emailLayout({
            heading: t.heading,
            preview: t.preview(a),
            body: t.body(a).map((line) => p(esc(line))).join(''),
            cta: { label: t.cta, url: dashboardUrl },
        }),
        text: t.text(a),
    });
}

export async function sendPaymentReceiptEmail(
    email: string,
    fullName: string,
    amount: number,
    description: string,
    orderId: string,
    transactionId: string,
    locale?: string | null
): Promise<boolean> {
    const t = emailStrings(locale).paymentReceipt;
    const a = { name: fullName, amount: String(amount), plan: description, link: `${APP_URL}/profile` };
    return sendEmail({
        to: email,
        subject: t.subject(a),
        html: emailLayout({
            heading: t.heading,
            preview: t.preview(a),
            body: t.body(a).map((line) => p(esc(line))).join(''),
            cta: { label: t.cta, url: `${APP_URL}/profile` },
        }),
        text: t.text(a),
    });
}

export async function sendTaskCancelledNotification(
    email: string,
    taskTitle: string,
    taskLink: string,
    locale?: string | null
): Promise<boolean> {
    const t = emailStrings(locale).taskCancelled;
    const a = { task: taskTitle, link: taskLink };
    return sendEmail({
        to: email,
        subject: t.subject(a),
        html: emailLayout({
            heading: t.heading,
            preview: t.preview(a),
            body: t.body(a).map((line) => p(esc(line))).join(''),
            cta: { label: t.cta, url: taskLink },
        }),
        text: t.text(a),
    });
}
