/**
 * Brevo (formerly Sendinblue) Transactional SMS Client
 *
 * Uses the @getbrevo/brevo SDK to send transactional SMS.
 * Requires BREVO_API_KEY to be set in environment variables.
 *
 * API docs: https://developers.brevo.com/reference/sendtransacsms
 */

import { BrevoClient } from '@getbrevo/brevo';

let brevoClient: BrevoClient | null = null;

function getBrevoClient(): BrevoClient | null {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) return null;
    if (!brevoClient) {
        brevoClient = new BrevoClient({ apiKey });
    }
    return brevoClient;
}

interface SendSMSParams {
    recipient: string; // e.g., +992927777777  (E.164 format)
    body: string;
}

export const sendSMS = async ({ recipient, body }: SendSMSParams) => {
    const client = getBrevoClient();

    if (!client) {
        console.error('Cannot send SMS: BREVO_API_KEY is missing');
        throw new Error('Brevo SMS configuration missing. Set BREVO_API_KEY in .env');
    }

    const smsName = process.env.BREVO_SMS_SENDER || 'Dastiyor';

    try {
        // sendAsyncTransactionalSms -> POST /v3/transactionalSMS/send, the documented
        // endpoint. Do NOT switch to sendTransacSms: despite the friendlier name it
        // posts to /v3/transactionalSMS/sms, which answers every request with
        // 400 "No sms related addons are found for the given organization" -- an
        // error about the endpoint, not about the account.
        const response = await client.transactionalSms.sendAsyncTransactionalSms({
            sender: smsName,
            recipient: recipient,
            content: body,
            type: 'transactional',
            unicodeEnabled: true,
        } as unknown as Parameters<typeof client.transactionalSms.sendTransacSms>[0]); // 'content' is required by the API but missing from SDK types

        // /transactionalSMS/send returns messageId only -- no reference or credit count.
        console.log('Brevo SMS sent successfully:', { messageId: response.messageId });

        return response;
    } catch (error) {
        console.error('Brevo SMS Error:', error instanceof Error ? error.message : error);
        throw error;
    }
};
