/** @jest-environment node */
const send = jest.fn().mockResolvedValue({});
jest.mock('@getbrevo/brevo', () => ({
    BrevoClient: jest.fn().mockImplementation(() => ({ transactionalEmails: { sendTransacEmail: send } })),
}));

import { sendPlanEndingEmail } from '../email';

describe('sendPlanEndingEmail', () => {
    beforeAll(() => {
        process.env.BREVO_API_KEY = 'k';
        process.env.BREVO_FROM_EMAIL = 'noreply@dastiyor.com';
    });
    beforeEach(() => send.mockClear());

    it('asks the provider to renew on the website, in their language', async () => {
        await sendPlanEndingEmail('p@test.tj', 'Ali <b>', 'PRO+', '15.11.2026', 'tj');

        const msg = send.mock.calls[0][0];
        expect(msg.to).toEqual([{ email: 'p@test.tj' }]);
        expect(msg.subject).toBe('Тарифи PRO+ 15.11.2026 ба охир мерасад — Dastiyor');
        expect(msg.htmlContent).toContain('/subscription');
        expect(msg.htmlContent).toContain('Дароз кардани тариф');
        expect(msg.htmlContent).not.toContain('<b>');
        expect(msg.textContent).toMatch(/\/subscription$/);
    });

    it('defaults to Russian', async () => {
        await sendPlanEndingEmail('p@test.tj', 'Ali', 'PRO', '15.11.2026', null);
        expect(send.mock.calls[0][0].subject).toBe('Тариф PRO заканчивается 15.11.2026 — Dastiyor');
    });
});
