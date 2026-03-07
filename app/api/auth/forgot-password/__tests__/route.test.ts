import { POST } from '../route';
import { prismaMock } from '../../../../../__tests__/mocks/prisma';
import { NextRequest } from 'next/server';



describe('/api/auth/forgot-password', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return 400 if email is missing', async () => {
        const request = new NextRequest('http://localhost/api/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({}),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Email is required');
    });

    it('should return 200 with generic message when user does not exist (no enumeration)', async () => {
        (prismaMock.user.findUnique as jest.Mock).mockResolvedValue(null);

        const request = new NextRequest('http://localhost/api/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email: 'nonexistent@example.com' }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.message).toContain('If an account exists');
        expect(prismaMock.passwordReset.create).not.toHaveBeenCalled();
    });

    it('should create reset token and invalidate previous when user exists', async () => {
        (prismaMock.user.findUnique as jest.Mock).mockResolvedValue({
            id: 'user-1',
            email: 'user@example.com',
        });
        (prismaMock.passwordReset.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
        (prismaMock.passwordReset.create as jest.Mock).mockResolvedValue({});

        const request = new NextRequest('http://localhost/api/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email: 'user@example.com' }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.message).toContain('If an account exists');
        expect(prismaMock.passwordReset.updateMany).toHaveBeenCalledWith({
            where: { userId: 'user-1', used: false },
            data: { used: true },
        });
        expect(prismaMock.passwordReset.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    userId: 'user-1',
                    expiresAt: expect.any(Date),
                }),
            })
        );
    });

    it('should look up user by lowercase email', async () => {
        (prismaMock.user.findUnique as jest.Mock).mockResolvedValue({
            id: 'user-1',
            email: 'user@example.com',
        });
        (prismaMock.passwordReset.updateMany as jest.Mock).mockResolvedValue({});
        (prismaMock.passwordReset.create as jest.Mock).mockResolvedValue({});

        const request = new NextRequest('http://localhost/api/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email: 'USER@Example.COM' }),
        });

        await POST(request);

        expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
            where: { email: 'user@example.com' },
        });
    });

    it('should handle server errors', async () => {
        (prismaMock.user.findUnique as jest.Mock).mockRejectedValue(new Error('DB error'));

        const request = new NextRequest('http://localhost/api/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email: 'user@example.com' }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Internal Server Error');
    });
});
