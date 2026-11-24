/** @jest-environment node */
import { GET, POST } from '../route';
import { prismaMock } from '../../../../../__tests__/mocks/prisma';
import { requireAuth } from '@/lib/require-auth';
import { getRoleSwitchPreview, switchRole, ROLE_SWITCH_ERRORS } from '@/lib/role-switch';
import { checkRateLimit } from '@/lib/rate-limit';
import { signJWT } from '@/lib/auth';
import { logAction } from '@/lib/audit';

jest.mock('@/lib/require-auth', () => ({ requireAuth: jest.fn() }));
jest.mock('@/lib/auth', () => ({ signJWT: jest.fn(async () => 'new-token'), SESSION_MAX_AGE: 2592000 }));
jest.mock('@/lib/audit', () => ({ logAction: jest.fn(), getRequestIP: jest.fn(() => '1.2.3.4') }));
jest.mock('@/lib/rate-limit', () => ({
    checkRateLimit: jest.fn(async () => ({ allowed: true, remaining: 4, resetIn: 0 })),
    getClientIP: jest.fn(() => '1.2.3.4'),
    rateLimitExceededResponse: jest.fn(() => new Response('{}', { status: 429 })),
}));
jest.mock('@/lib/role-switch', () => ({
    ...jest.requireActual('@/lib/role-switch'),
    getRoleSwitchPreview: jest.fn(),
    switchRole: jest.fn(),
}));

const auth = requireAuth as jest.Mock;
const req = (body?: unknown) => new Request('http://localhost/api/account/role', {
    method: body === undefined ? 'GET' : 'POST',
    ...(body !== undefined && { body: JSON.stringify(body) }),
});

describe('/api/account/role', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        auth.mockResolvedValue({ id: 'u1', role: 'CUSTOMER' });
    });

    it('401 without a session', async () => {
        auth.mockResolvedValue(null);
        expect((await GET(req())).status).toBe(401);
        expect((await POST(req({ role: 'PROVIDER' }))).status).toBe(401);
        expect(switchRole).not.toHaveBeenCalled();
    });

    it('GET returns the preview, 404 when the user is gone', async () => {
        const preview = { role: 'CUSTOMER', target: 'PROVIDER', openTasks: 1, pendingResponses: 0, blocker: null };
        (getRoleSwitchPreview as jest.Mock).mockResolvedValue(preview);
        const res = await GET(req());
        expect(res.status).toBe(200);
        expect(await res.json()).toEqual(preview);

        (getRoleSwitchPreview as jest.Mock).mockResolvedValue(null);
        expect((await GET(req())).status).toBe(404);
    });

    it('POST passes the refusal through', async () => {
        (switchRole as jest.Mock).mockResolvedValue({ ok: false, status: 409, error: ROLE_SWITCH_ERRORS.inProgress });
        const res = await POST(req({ role: 'PROVIDER' }));
        expect(res.status).toBe(409);
        expect((await res.json()).error).toBe(ROLE_SWITCH_ERRORS.inProgress);
        expect(logAction).not.toHaveBeenCalled();
    });

    it('POST is rate limited', async () => {
        (checkRateLimit as jest.Mock).mockResolvedValueOnce({ allowed: false, resetIn: 30 });
        expect((await POST(req({ role: 'PROVIDER' }))).status).toBe(429);
        expect(switchRole).not.toHaveBeenCalled();
    });

    it('POST switches, issues a token carrying the new role and sets the cookie', async () => {
        (switchRole as jest.Mock).mockResolvedValue({ ok: true, role: 'PROVIDER', cancelledTasks: 2, withdrawnResponses: 0 });
        prismaMock.user.findUnique.mockResolvedValue({ id: 'u1', email: 'a@b.tj', fullName: 'A', role: 'PROVIDER', tokenVersion: 3 } as never);

        const res = await POST(req({ role: 'PROVIDER' }));
        expect(res.status).toBe(200);
        expect(switchRole).toHaveBeenCalledWith('u1', 'PROVIDER');
        const json = await res.json();
        expect(json).toMatchObject({ user: { id: 'u1', role: 'PROVIDER' }, cancelledTasks: 2 });

        expect(json.token).toBe('new-token');
        expect(signJWT).toHaveBeenCalledWith({ id: 'u1', email: 'a@b.tj', role: 'PROVIDER', tv: 3 });
        expect(res.headers.get('set-cookie')).toContain('token=new-token');
        expect(logAction).toHaveBeenCalledWith(expect.objectContaining({
            action: 'SWITCH_ROLE', details: { from: 'CUSTOMER', to: 'PROVIDER', cancelledTasks: 2, withdrawnResponses: 0 },
        }));
    });
});
