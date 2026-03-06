/**
 * SMS Notification Service
 *
 * This service handles sending SMS notifications via Brevo (formerly Sendinblue).
 * Requires BREVO_API_KEY to be set in environment variables.
 */

interface SMSOptions {
    to: string; // Phone number in E.164 format (e.g., +992901234567)
    message: string;
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

        // Use our Brevo SMS integration
        const { sendSMS: sendRealSMS } = require('@/lib/brevo-sms');

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
    return sendSMS({
        to: phone,
        message: `Ваш код подтверждения Dastiyor: ${code}. Код действителен 10 минут.`
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
