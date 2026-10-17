/** @jest-environment node */
const send = jest.fn().mockResolvedValue({});
jest.mock('@getbrevo/brevo', () => ({
    BrevoClient: jest.fn().mockImplementation(() => ({ transactionalEmails: { sendTransacEmail: send } })),
}));

import { sendSourcingRequestEmail } from '../email';

describe('sendSourcingRequestEmail', () => {
    beforeAll(() => {
        process.env.BREVO_API_KEY = 'k';
        process.env.BREVO_FROM_EMAIL = 'noreply@dastiyor.com';
    });

    it('sends the request to the team with user text escaped', async () => {
        await sendSourcingRequestEmail('team@dastiyor.com', {
            id: 'sr1', category: 'Ремонт', city: 'Худжанд', headcount: 3, experienceYears: null, budget: null,
            deadline: new Date('2026-11-01'), description: 'Нужны мастера <script>alert(1)</script>',
            contactName: 'ООО <b>Пример</b>', contactPhone: '+992935001234', contactEmail: null,
        });

        const msg = send.mock.calls[0][0];
        expect(msg.to).toEqual([{ email: 'team@dastiyor.com' }]);
        expect(msg.subject).toBe('Новый запрос на подбор: Ремонт, Худжанд (3)');
        expect(msg.htmlContent).not.toContain('<script>');
        expect(msg.htmlContent).toContain('&lt;script&gt;');
        expect(msg.htmlContent).toContain('2026-11-01');
        expect(msg.textContent).toContain('Телефон: +992935001234');
    });
});
