import { POST } from '../route';
import { prismaMock } from '../../../../../__tests__/mocks/prisma';
import { verifyJWT } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';



jest.mock('@/lib/auth', () => ({ verifyJWT: jest.fn(), getBearerToken: jest.fn(() => null) }));
jest.mock('next/headers', () => ({ cookies: jest.fn() }));

describe('/api/responses/reject', () => {
    const mockUserId = 'customer-1';
    const mockPayload = { id: mockUserId };

    beforeEach(() => {
        jest.clearAllMocks();
        (cookies as jest.Mock).mockResolvedValue({
            get: jest.fn(() => ({ value: 'token' })),
        });
        (verifyJWT as jest.Mock).mockResolvedValue(mockPayload);
    });

    it('should return 401 if no token', async () => {
        (cookies as jest.Mock).mockResolvedValue({ get: jest.fn(() => undefined) });

        const request = new NextRequest('http://localhost/api/responses/reject', {
            method: 'POST',
            body: JSON.stringify({ responseId: 'resp-1' }),
        });

        const response = await POST(request);
        expect(response.status).toBe(401);
    });

    it('should return 400 if responseId is missing', async () => {
        const request = new NextRequest('http://localhost/api/responses/reject', {
            method: 'POST',
            body: JSON.stringify({}),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Response ID is required');
    });

    it('should return 404 if response not found', async () => {
        (prismaMock.response.findUnique as jest.Mock).mockResolvedValue(null);

        const request = new NextRequest('http://localhost/api/responses/reject', {
            method: 'POST',
            body: JSON.stringify({ responseId: 'nonexistent' }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe('Response not found');
    });

    it('should return 403 if user is not task owner', async () => {
        (prismaMock.response.findUnique as jest.Mock).mockResolvedValue({
            id: 'resp-1',
            userId: 'provider-1',
            taskId: 'task-1',
            status: 'PENDING',
            task: { userId: 'other-owner', title: 'Task' },
        });

        const request = new NextRequest('http://localhost/api/responses/reject', {
            method: 'POST',
            body: JSON.stringify({ responseId: 'resp-1' }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toContain('Only task owner');
    });

    it('should return 400 if response is not PENDING', async () => {
        (prismaMock.response.findUnique as jest.Mock).mockResolvedValue({
            id: 'resp-1',
            userId: 'provider-1',
            taskId: 'task-1',
            status: 'ACCEPTED',
            task: { userId: mockUserId, title: 'Task' },
        });

        const request = new NextRequest('http://localhost/api/responses/reject', {
            method: 'POST',
            body: JSON.stringify({ responseId: 'resp-1' }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('Only pending');
    });

    it('should reject response and notify provider', async () => {
        (prismaMock.response.findUnique as jest.Mock).mockResolvedValue({
            id: 'resp-1',
            userId: 'provider-1',
            taskId: 'task-1',
            status: 'PENDING',
            task: { userId: mockUserId, title: 'Test Task' },
        });
        (prismaMock.response.update as jest.Mock).mockResolvedValue({});
        (prismaMock.notification.create as jest.Mock).mockResolvedValue({});

        const request = new NextRequest('http://localhost/api/responses/reject', {
            method: 'POST',
            body: JSON.stringify({ responseId: 'resp-1' }),
        });

        const response = await POST(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.message).toBe('Response rejected successfully');
        expect(prismaMock.response.update).toHaveBeenCalledWith({
            where: { id: 'resp-1' },
            data: { status: 'REJECTED' },
        });
        expect(prismaMock.notification.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    userId: 'provider-1',
                    type: 'OFFER_REJECTED',
                }),
            })
        );
    });
});
