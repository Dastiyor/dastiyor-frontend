import { POST } from '../route';
import { consumeOtp } from '@/lib/otp';
import { checkRateLimit } from '@/lib/rate-limit';
import { issueRegistrationTicket } from '@/lib/registration-ticket';

jest.mock('@/lib/otp', () => ({ consumeOtp: jest.fn() }));
jest.mock('@/lib/registration-ticket', () => ({ issueRegistrationTicket: jest.fn() }));
jest.mock('@/lib/rate-limit', () => ({
    getClientIP: jest.fn(() => '127.0.0.1'),
    checkRateLimit: jest.fn(),
    rateLimitExceededResponse: jest.fn(() => new Response(JSON.stringify({ error: 'limit' }), { status: 429 })),
}));

const post = (body: unknown) =>
    POST(new Request('http://localhost/api/auth/verify-check', { method: 'POST', body: JSON.stringify(body) }));

describe('POST /api/auth/verify-check', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (checkRateLimit as jest.Mock).mockResolvedValue({ allowed: true });
        (consumeOtp as jest.Mock).mockResolvedValue(true);
        (issueRegistrationTicket as jest.Mock).mockResolvedValue('ticket-1');
    });

    it('requires a phone and a code', async () => {
        const res = await post({ phone: '+992900000001' });
        expect(res.status).toBe(400);
        expect(consumeOtp).not.toHaveBeenCalled();
    });

    it('rejects a wrong code without a ticket', async () => {
        (consumeOtp as jest.Mock).mockResolvedValue(false);
        const res = await post({ phone: '+992900000001', code: '000000' });
        expect(res.status).toBe(400);
        expect((await res.json()).ticket).toBeUndefined();
        expect(issueRegistrationTicket).not.toHaveBeenCalled();
    });

    it('answers a passed REGISTRATION code with a ticket for that phone', async () => {
        const res = await post({ phone: '992 900 000 001', code: '123456' });
        const data = await res.json();
        expect(res.status).toBe(200);
        expect(data).toEqual(expect.objectContaining({ success: true, ticket: 'ticket-1' }));
        expect(consumeOtp).toHaveBeenCalledWith('+992900000001', '123456', 'REGISTRATION');
        expect(issueRegistrationTicket).toHaveBeenCalledWith('+992900000001');
    });

    it('gives no ticket for other code types', async () => {
        const res = await post({ phone: '+992900000001', code: '123456', type: 'LOGIN' });
        expect(res.status).toBe(200);
        expect((await res.json()).ticket).toBeUndefined();
        expect(issueRegistrationTicket).not.toHaveBeenCalled();
    });

    it('stops guessing at the per-phone limit', async () => {
        (checkRateLimit as jest.Mock).mockImplementation(async (key: string) => ({ allowed: !key.startsWith('otp:') }));
        const res = await post({ phone: '+992900000001', code: '123456' });
        expect(res.status).toBe(429);
        expect(consumeOtp).not.toHaveBeenCalled();
    });
});
