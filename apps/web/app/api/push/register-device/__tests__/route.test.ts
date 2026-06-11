import { POST, DELETE } from '../route';
import { prismaMock } from '../../../../../__tests__/mocks/prisma';
import { verifyJWTWithVersion } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

jest.mock('@/lib/auth', () => ({
  verifyJWTWithVersion: jest.fn(),
  getBearerToken: jest.fn(() => null),
}));
jest.mock('next/headers', () => ({ cookies: jest.fn() }));

const VALID_TOKEN = 'ExponentPushToken[abc123def456]';

function req(method: string, body: unknown) {
  return new NextRequest('http://localhost/api/push/register-device', {
    method,
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('/api/push/register-device', () => {
  const mockUserId = 'user-1';

  beforeEach(() => {
    jest.clearAllMocks();
    (cookies as jest.Mock).mockResolvedValue({
      get: jest.fn(() => ({ value: 'token' })),
    });
    (verifyJWTWithVersion as jest.Mock).mockResolvedValue({ id: mockUserId });
  });

  describe('POST', () => {
    it('rejects unauthenticated requests', async () => {
      (cookies as jest.Mock).mockResolvedValue({ get: jest.fn(() => undefined) });
      const res = await POST(req('POST', { token: VALID_TOKEN }));
      expect(res.status).toBe(401);
    });

    it('rejects a malformed Expo token', async () => {
      const res = await POST(req('POST', { token: 'not-a-real-token' }));
      expect(res.status).toBe(400);
      expect(prismaMock.deviceToken.upsert).not.toHaveBeenCalled();
    });

    it('upserts a valid token for the current user', async () => {
      (prismaMock.deviceToken.upsert as jest.Mock).mockResolvedValue({});
      const res = await POST(req('POST', { token: VALID_TOKEN, platform: 'android' }));
      expect(res.status).toBe(200);
      expect(prismaMock.deviceToken.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { token: VALID_TOKEN },
          create: expect.objectContaining({
            token: VALID_TOKEN,
            platform: 'android',
            userId: mockUserId,
          }),
        }),
      );
    });

    it('normalizes an unknown platform to null', async () => {
      (prismaMock.deviceToken.upsert as jest.Mock).mockResolvedValue({});
      await POST(req('POST', { token: VALID_TOKEN, platform: 'windows' }));
      const arg = (prismaMock.deviceToken.upsert as jest.Mock).mock.calls[0][0];
      expect(arg.create.platform).toBeNull();
    });
  });

  describe('DELETE', () => {
    it('rejects unauthenticated requests', async () => {
      (cookies as jest.Mock).mockResolvedValue({ get: jest.fn(() => undefined) });
      const res = await DELETE(req('DELETE', { token: VALID_TOKEN }));
      expect(res.status).toBe(401);
    });

    it('removes the token scoped to the current user', async () => {
      (prismaMock.deviceToken.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
      const res = await DELETE(req('DELETE', { token: VALID_TOKEN }));
      expect(res.status).toBe(200);
      expect(prismaMock.deviceToken.deleteMany).toHaveBeenCalledWith({
        where: { token: VALID_TOKEN, userId: mockUserId },
      });
    });
  });
});
