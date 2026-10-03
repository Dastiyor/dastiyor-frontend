/**
 * SMS Notification Service
 *
 * Tajik numbers (+992) go through Payom.tj when PAYOM_API_HOST and
 * PAYOM_API_TOKEN are set; everything else, or any number while Payom is
 * unconfigured, goes through Brevo (BREVO_API_KEY).
 */

import { isPayomConfigured, isPayomRecipient, sendPayomSMS } from '@/lib/payom-sms';

interface SMSOptions {
    to: string; // Phone number in E.164 format (e.g., +992901234567)
    message: string;
    /** Payom template to send instead of `message` (individual Payom accounts can't send free text). */
    payomTemplate?: { id: string; variables: Record<string, string | number> };
}

export async function sendSMS(options: SMSOptions): Promise<boolean> {
    try {
        // In development, we can still log it for easier debugging
        if (process.env.NODE_ENV === 'development') {
            console.log('='.repeat(60));
            console.log('SMS NOTIFICATION (Dev Log):');
            console.log('To:', options.to);
            console.log('Message:', options.message);
            console.log('='.repeat(60));
            // If you want to ONLY log in dev and not send real SMS, uncomment the next line:
            // return true;
        }

        if (isPayomConfigured() && isPayomRecipient(options.to)) {
            try {
                await sendPayomSMS(
                    options.payomTemplate
                        ? { recipient: options.to, template: options.payomTemplate }
                        : { recipient: options.to, text: options.message }
                );
                return true;
            } catch (smsError) {
                console.error('Failed to send SMS via Payom:', smsError);
                return false;
            }
        }

        // Use our Brevo SMS integration
        const { sendSMS: sendRealSMS } = await import('@/lib/brevo-sms');

        try {
            await sendRealSMS({
                recipient: options.to,
                body: options.message
            });
            return true;
        } catch (smsError) {
            console.error('Failed to send SMS via Brevo:', smsError);
            return false;
        }
    } catch (error) {
        console.error('SMS sending error:', error);
        return false;
    }
}

export async function sendVerificationCode(phone: string, code: string): Promise<boolean> {
    // The Payom template must take a `code` variable.
    const templateId = process.env.PAYOM_OTP_TEMPLATE_ID;
    return sendSMS({
        to: phone,
        message: `Ваш код подтверждения Dastiyor: ${code}. Код действителен 10 минут.`,
        payomTemplate: templateId ? { id: templateId, variables: { code } } : undefined,
    });
}

export async function sendTaskResponseSMS(phone: string, taskTitle: string, providerName: string, price: string): Promise<boolean> {
    return sendSMS({
        to: phone,
        message: `Новое предложение на задание "${taskTitle}" от ${providerName}. Цена: ${price} с. Dastiyor`
    });
}

export async function sendOfferAcceptedSMS(phone: string, taskTitle: string): Promise<boolean> {
    return sendSMS({
        to: phone,
        message: `Ваш отклик на задание "${taskTitle}" принят! Свяжитесь с заказчиком. Dastiyor`
    });
}
