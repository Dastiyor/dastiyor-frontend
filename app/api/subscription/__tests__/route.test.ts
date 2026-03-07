import { GET, POST, DELETE } from '../route';
import { prismaMock } from '../../../../__tests__/mocks/prisma';
import { verifyJWT } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';



jest.mock('@/lib/auth', () => ({ verifyJWT: jest.fn() }));
jest.mock('next/headers', () => ({ cookies: jest.fn() }));

describe('/api/subscription', () => {
    const mockUserId = 'user-1';
    const mockPayload = { id: mockUserId };

    beforeEach(() => {
        jest.clearAllMocks();
        (cookies as jest.Mock).mockResolvedValue({
            get: jest.fn(() => ({ value: 'token' })),
        });
        (verifyJWT as jest.Mock).mockResolvedValue(mockPayload);
    });

    describe('GET', () => {
        it('should return 401 if no token', async () => {
            (cookies as jest.Mock).mockResolvedValue({ get: jest.fn(() => undefined) });

            const response = await GET();
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.error).toBe('Unauthorized');
        });

        it('should return null subscription when user has none', async () => {
            (prismaMock.subscription.findUnique as jest.Mock).mockResolvedValue(null);

            const response = await GET();
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.subscription).toBeNull();
        });

        it('should return subscription with isCurrentlyActive and daysRemaining', async () => {
            const futureEnd = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
            (prismaMock.subscription.findUnique as jest.Mock).mockResolvedValue({
                id: 'sub-1',
                userId: mockUserId,
                plan: 'standard',
                startDate: new Date(),
                endDate: futureEnd,
                isActive: true,
            });

            const response = await GET();
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.subscription).toBeDefined();
            expect(data.subscription.isCurrentlyActive).toBe(true);
            expect(data.subscription.daysRemaining).toBeGreaterThanOrEqual(9);
        });

        it('should return isCurrentlyActive false when endDate passed', async () => {
            const pastEnd = new Date(Date.now() - 1000);
            (prismaMock.subscription.findUnique as jest.Mock).mockResolvedValue({
                id: 'sub-1',
                userId: mockUserId,
                plan: 'basic',
                startDate: new Date(),
                endDate: pastEnd,
                isActive: true,
            });

            const response = await GET();
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.subscription.isCurrentlyActive).toBe(false);
            expect(data.subscription.daysRemaining).toBe(0);
        });
    });

    describe('POST', () => {
        it('should return 401 if no token', async () => {
            (cookies as jest.Mock).mockResolvedValue({ get: jest.fn(() => undefined) });

            const request = new NextRequest('http://localhost/api/subscription', {
                method: 'POST',
                body: JSON.stringify({ plan: 'basic' }),
            });

            const response = await POST(request);
            expect(response.status).toBe(401);
        });

        it('should return 400 if plan is missing or invalid', async () => {
            const req1 = new NextRequest('http://localhost/api/subscription', {
                method: 'POST',
                body: JSON.stringify({}),
            });
            const res1 = await POST(req1);
            expect(res1.status).toBe(400);
            expect((await res1.json()).error).toBe('Invalid plan');

            const req2 = new NextRequest('http://localhost/api/subscription', {
                method: 'POST',
                body: JSON.stringify({ plan: 'invalid_plan' }),
            });
            const res2 = await POST(req2);
            expect(res2.status).toBe(400);
        });

        it('should create new subscription for valid plan', async () => {
            (prismaMock.subscription.findUnique as jest.Mock).mockResolvedValue(null);
            (prismaMock.subscription.create as jest.Mock).mockResolvedValue({
                id: 'sub-1',
                userId: mockUserId,
                plan: 'basic',
                startDate: new Date(),
                endDate: new Date(),
                isActive: true,
            });

            const request = new NextRequest('http://localhost/api/subscription', {
                method: 'POST',
                body: JSON.stringify({ plan: 'basic' }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.message).toBe('Subscription activated successfully');
            expect(data.subscription).toBeDefined();
            expect(data.subscription.planDetails).toBeDefined();
            expect(prismaMock.subscription.create).toHaveBeenCalled();
        });

        it('should accept standard and premium plans', async () => {
            (prismaMock.subscription.findUnique as jest.Mock).mockResolvedValue(null);
            (prismaMock.subscription.create as jest.Mock).mockResolvedValue({
                id: 'sub-1',
                userId: mockUserId,
                plan: 'standard',
                startDate: new Date(),
                endDate: new Date(),
                isActive: true,
            });

            const request = new NextRequest('http://localhost/api/subscription', {
                method: 'POST',
                body: JSON.stringify({ plan: 'standard' }),
            });

            const response = await POST(request);
            expect(response.status).toBe(200);
        });
    });

    describe('DELETE', () => {
        it('should return 401 if no token', async () => {
            (cookies as jest.Mock).mockResolvedValue({ get: jest.fn(() => undefined) });

            const response = await DELETE();
            expect(response.status).toBe(401);
        });

        it('should return 404 if no subscription found', async () => {
            (prismaMock.subscription.findUnique as jest.Mock).mockResolvedValue(null);

            const response = await DELETE();
            const data = await response.json();

            expect(response.status).toBe(404);
            expect(data.error).toBe('No subscription found');
        });

        it('should set subscription isActive to false', async () => {
            (prismaMock.subscription.findUnique as jest.Mock).mockResolvedValue({
                id: 'sub-1',
                userId: mockUserId,
            });
            (prismaMock.subscription.update as jest.Mock).mockResolvedValue({});

            const response = await DELETE();
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.message).toContain('cancelled');
            expect(prismaMock.subscription.update).toHaveBeenCalledWith({
                where: { userId: mockUserId },
                data: { isActive: false },
            });
        });
    });
});
