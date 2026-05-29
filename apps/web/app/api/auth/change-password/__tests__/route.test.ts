import { POST } from '../route';
import { prismaMock } from '../../../../../__tests__/mocks/prisma';
import { verifyJWTWithVersion } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

jest.mock('@/lib/auth', () => ({
    verifyJWTWithVersion: jest.fn(),
    getBearerToken: jest.fn(() => null),
}));

jest.mock('next/headers', () => ({
    cookies: jest.fn(),
}));

const makeRequest = (body: object) =>
    new NextRequest('http://localhost/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(body),
    });

describe('/api/auth/change-password', () => {
    const mockUserId = 'user-1';

    beforeEach(() => {
        jest.clearAllMocks();
        (cookies as jest.Mock).mockResolvedValue({
            get: jest.fn(() => ({ value: 'valid-token' })),
        });
        (verifyJWTWithVersion as jest.Mock).mockResolvedValue({ id: mockUserId });
    });

    it('returns 401 when no token provided', async () => {
        (cookies as jest.Mock).mockResolvedValue({ get: jest.fn(() => undefined) });

        const response = await POST(makeRequest({ currentPassword: 'old', newPassword: 'newpass123' }));
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
    });

    it('returns 400 when currentPassword is missing', async () => {
        const response = await POST(makeRequest({ newPassword: 'newpass123' }));
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Missing required fields');
    });

    it('returns 400 when newPassword is missing', async () => {
        const response = await POST(makeRequest({ currentPassword: 'oldpass' }));
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Missing required fields');
    });

    it('returns 400 when new password is shorter than 8 characters', async () => {
        const response = await POST(makeRequest({ currentPassword: 'oldpass123', newPassword: 'short' }));
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Password must be at least 8 characters');
    });

    it('returns 404 when user not found in DB', async () => {
        prismaMock.user.findUnique.mockResolvedValue(null);

        const response = await POST(makeRequest({ currentPassword: 'oldpass123', newPassword: 'newpass123' }));
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe('User not found');
    });

    it('returns 400 when user has no password (OAuth account)', async () => {
        prismaMock.user.findUnique.mockResolvedValue({
            id: mockUserId,
            password: null,
        } as any);

        const response = await POST(makeRequest({ currentPassword: 'anything', newPassword: 'newpass123' }));
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('Google or Apple');
    });

    it('returns 400 when current password is incorrect', async () => {
        const hashed = await bcrypt.hash('correctpass', 10);
        prismaMock.user.findUnique.mockResolvedValue({
            id: mockUserId,
            password: hashed,
        } as any);

        const response = await POST(makeRequest({ currentPassword: 'wrongpass', newPassword: 'newpass123' }));
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Current password is incorrect');
    });

    it('returns 200 and updates password on success', async () => {
        const hashed = await bcrypt.hash('correctpass', 10);
        prismaMock.user.findUnique.mockResolvedValue({
            id: mockUserId,
            password: hashed,
        } as any);
        prismaMock.user.update.mockResolvedValue({} as any);

        const response = await POST(makeRequest({ currentPassword: 'correctpass', newPassword: 'newpass123' }));
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.message).toBe('Password changed successfully');
        expect(prismaMock.user.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: mockUserId },
                data: expect.objectContaining({ password: expect.any(String) }),
            })
        );
    });

    it('hashes the new password before storing', async () => {
        const hashed = await bcrypt.hash('correctpass', 10);
        prismaMock.user.findUnique.mockResolvedValue({
            id: mockUserId,
            password: hashed,
        } as any);
        prismaMock.user.update.mockResolvedValue({} as any);

        await POST(makeRequest({ currentPassword: 'correctpass', newPassword: 'newpass123' }));

        const updateCall = prismaMock.user.update.mock.calls[0][0];
        const storedHash = updateCall.data.password;
        // Should be a bcrypt hash, not plaintext
        expect(storedHash).not.toBe('newpass123');
        expect(storedHash).toMatch(/^\$2[ab]\$/);
    });

    it('returns 500 on database error', async () => {
        prismaMock.user.findUnique.mockRejectedValue(new Error('DB error'));

        const response = await POST(makeRequest({ currentPassword: 'old', newPassword: 'newpass123' }));
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Internal Server Error');
    });
});
