/**
 * Payom.tj SMS client — a local Tajik SMS gateway, used for +992 numbers.
 *
 * POST https://{PAYOM_API_HOST}/api/message with a JWT bearer token. The host
 * and the token are both issued in the Payom cabinet after registration.
 * Spec: https://payom.tj/payom-api.yaml (Swagger UI at /api-docs).
 *
 * Two send modes. Free text (`text`) is allowed for legal entities only; an
 * individual account must send through a template created in the cabinet
 * (`templateMessage`). Answers 201 with the queued message; 401 on a bad
 * token, 422 with `violations` on validation errors.
 */

const TJ_PHONE = /^\+992\d{9}$/;

export function isPayomConfigured(): boolean {
    return !!process.env.PAYOM_API_HOST && !!process.env.PAYOM_API_TOKEN;
}

/** Payom only delivers to Tajik numbers; its schema rejects anything else. */
export function isPayomRecipient(phone: string): boolean {
    return TJ_PHONE.test(phone);
}

interface SendPayomSMSParams {
    recipient: string; // +992XXXXXXXXX
    text?: string;
    template?: { id: string; variables: Record<string, string | number> };
}

interface PayomMessageResponse {
    id: string;
    deliveryStatus: string;
}

export async function sendPayomSMS({ recipient, text, template }: SendPayomSMSParams): Promise<PayomMessageResponse> {
    const host = process.env.PAYOM_API_HOST;
    const token = process.env.PAYOM_API_TOKEN;
    if (!host || !token) {
        throw new Error('Payom SMS configuration missing. Set PAYOM_API_HOST and PAYOM_API_TOKEN');
    }

    // Accept the host with or without a scheme, as it gets pasted from the cabinet.
    const base = host.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    const body: Record<string, unknown> = {
        telephone: recipient,
        // Latin letters, digits and dots, up to 11 chars; must be registered in Payom.
        senderName: process.env.PAYOM_SENDER_NAME || 'Dastiyor',
        type: 'SMS',
    };
    if (template) {
        body.templateMessage = { templateId: template.id, variables: template.variables };
    } else {
        body.text = text;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    let res: Response;
    try {
        res = await fetch(`https://${base}/api/message`, {
            method: 'POST',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
            signal: controller.signal,
        });
    } finally {
        clearTimeout(timeout);
    }

    const data = await res.json().catch(() => null);
    if (!res.ok) {
        const detail = data?.detail ?? data?.message ?? res.statusText;
        throw new Error(`Payom SMS failed (${res.status}): ${detail}`);
    }

    console.log('Payom SMS queued:', { id: data?.id, status: data?.deliveryStatus });
    return data as PayomMessageResponse;
}
