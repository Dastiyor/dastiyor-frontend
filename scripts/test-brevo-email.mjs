#!/usr/bin/env node
/**
 * Test Brevo email sending (run with: node --env-file=.env scripts/test-brevo-email.mjs your@email.com)
 * Requires: BREVO_API_KEY, BREVO_FROM_EMAIL (verified in Brevo). Optional: pass recipient as first arg.
 */

const recipient = process.argv[2] || process.env.RECIPIENT_EMAIL || process.env.BREVO_FROM_EMAIL;
const apiKey = process.env.BREVO_API_KEY;
const fromEmail = process.env.BREVO_FROM_EMAIL || process.env.EMAIL_FROM || 'noreply@example.com';
const fromName = process.env.BREVO_FROM_NAME || 'Dastiyor';

if (!apiKey) {
    console.error('Missing BREVO_API_KEY in .env');
    process.exit(1);
}
if (!recipient) {
    console.error('Pass recipient email: node --env-file=.env scripts/test-brevo-email.mjs your@email.com');
    process.exit(1);
}

const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        sender: { name: fromName, email: fromEmail },
        to: [{ email: recipient }],
        subject: 'Dastiyor – тестовое письмо',
        htmlContent: '<h2>Тестовое письмо</h2><p>Если вы получили это письмо, интеграция Brevo работает.</p>',
        textContent: 'Тестовое письмо. Интеграция Brevo работает.',
    }),
});

const data = await res.json().catch(() => ({}));
if (res.ok) {
    console.log('OK – email sent to', recipient);
} else {
    console.error('Brevo error:', res.status, data);
    process.exit(1);
}
