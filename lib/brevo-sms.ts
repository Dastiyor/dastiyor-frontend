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

export const sendSMS = async ({ recipient, body }: SendSMSParams): Promise<any> => {
    const client = getBrevoClient();

    if (!client) {
        console.error('Cannot send SMS: BREVO_API_KEY is missing');
        throw new Error('Brevo SMS configuration missing. Set BREVO_API_KEY in .env');
    }

    const smsName = process.env.BREVO_SMS_SENDER || 'Dastiyor';

    try {
        const response = await client.transactionalSms.sendTransacSms({
            sender: smsName,
            recipient: recipient,
            content: body,
            type: 'transactional',
            unicodeEnabled: true,
        } as any); // 'content' is required by the API but missing from SDK types

        console.log('Brevo SMS sent successfully:', {
            messageId: response.messageId,
            reference: response.reference,
            remainingCredits: response.remainingCredits,
        });

        return response;
    } catch (error: any) {
        console.error('Brevo SMS Error:', error?.message || error);
        throw error;
    }
};
