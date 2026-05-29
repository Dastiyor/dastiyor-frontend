import { GET, POST } from '../route';
import { prismaMock } from '../../../../__tests__/mocks/prisma';
import { verifyJWTWithVersion } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';



jest.mock('@/lib/auth', () => ({ verifyJWTWithVersion: jest.fn(), getBearerToken: jest.fn(() => null) }));
jest.mock('next/headers', () => ({ cookies: jest.fn() }));

describe('/api/reviews', () => {
    const mockUserId = 'customer-1';
    const mockPayload = { id: mockUserId };

    beforeEach(() => {
        jest.clearAllMocks();
        (cookies as jest.Mock).mockResolvedValue({
            get: jest.fn(() => ({ value: 'token' })),
        });
        (verifyJWTWithVersion as jest.Mock).mockResolvedValue(mockPayload);
    });

    describe('GET', () => {
        it('should return 400 if userId is missing', async () => {
            const request = new NextRequest('http://localhost/api/reviews');

            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Missing userId parameter');
        });

        it('should return reviews and stats for a user', async () => {
            const mockReviews = [
                {
                    id: 'r1',
                    rating: 5,
                    comment: 'Great work',
                    reviewerId: 'rev-1',
                    reviewedId: 'provider-1',
                    taskId: 'task-1',
                    createdAt: new Date(),
                    reviewer: { id: 'rev-1', fullName: 'Customer' },
                    task: { id: 'task-1', title: 'Task', category: 'Cleaning' },
                },
            ];

            (prismaMock.review.findMany as jest.Mock).mockResolvedValue(mockReviews);
            (prismaMock.review.count as jest.Mock).mockResolvedValue(1); // pagination count

            const request = new NextRequest('http://localhost/api/reviews?userId=provider-1');

            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.reviews).toHaveLength(1);
            expect(data.stats).toBeDefined();
            expect(data.stats.totalReviews).toBe(1);
            expect(data.stats.averageRating).toBe(5);
            expect(data.stats.breakdown).toBeDefined();
        });

        it('should return average rating 0 when no reviews', async () => {
            (prismaMock.review.findMany as jest.Mock).mockResolvedValue([]);
            (prismaMock.review.count as jest.Mock).mockResolvedValue(0);

            const request = new NextRequest('http://localhost/api/reviews?userId=provider-1');

            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.stats.averageRating).toBe(0);
        });
    });

    describe('POST', () => {
        it('should return 401 if no token', async () => {
            (cookies as jest.Mock).mockResolvedValue({ get: jest.fn(() => undefined) });

            const request = new NextRequest('http://localhost/api/reviews', {
                method: 'POST',
                body: JSON.stringify({ taskId: 'task-1', rating: 5 }),
            });

            const response = await POST(request);
            expect(response.status).toBe(401);
        });

        it('should return 400 if taskId or rating is missing', async () => {
            const req1 = new NextRequest('http://localhost/api/reviews', {
                method: 'POST',
                body: JSON.stringify({ rating: 5 }),
            });
            const res1 = await POST(req1);
            expect(res1.status).toBe(400);

            const req2 = new NextRequest('http://localhost/api/reviews', {
                method: 'POST',
                body: JSON.stringify({ taskId: 'task-1' }),
            });
            const res2 = await POST(req2);
            expect(res2.status).toBe(400);
        });

        it('should return 400 if rating is not 1-5', async () => {
            (prismaMock.task.findUnique as jest.Mock).mockResolvedValue({
                id: 'task-1',
                userId: mockUserId,
                status: 'COMPLETED',
                assignedUserId: 'provider-1',
                review: null,
            });

            const request = new NextRequest('http://localhost/api/reviews', {
                method: 'POST',
                body: JSON.stringify({ taskId: 'task-1', rating: 10 }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toContain('1 and 5');
        });

        it('should return 404 if task not found', async () => {
            (prismaMock.task.findUnique as jest.Mock).mockResolvedValue(null);

            const request = new NextRequest('http://localhost/api/reviews', {
                method: 'POST',
                body: JSON.stringify({ taskId: 'nonexistent', rating: 5 }),
            });

            const response = await POST(request);
            expect(response.status).toBe(404);
        });

        it('should return 403 if user is not task owner', async () => {
            (prismaMock.task.findUnique as jest.Mock).mockResolvedValue({
                id: 'task-1',
                userId: 'other-owner',
                status: 'COMPLETED',
                assignedUserId: 'provider-1',
                review: null,
            });

            const request = new NextRequest('http://localhost/api/reviews', {
                method: 'POST',
                body: JSON.stringify({ taskId: 'task-1', rating: 5 }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(403);
            expect(data.error).toContain('Only task owner');
        });

        it('should return 400 if task is not COMPLETED', async () => {
            (prismaMock.task.findUnique as jest.Mock).mockResolvedValue({
                id: 'task-1',
                userId: mockUserId,
                status: 'IN_PROGRESS',
                assignedUserId: 'provider-1',
                review: null,
            });

            const request = new NextRequest('http://localhost/api/reviews', {
                method: 'POST',
                body: JSON.stringify({ taskId: 'task-1', rating: 5 }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toContain('completed');
        });

        it('should return 400 if review already exists', async () => {
            (prismaMock.task.findUnique as jest.Mock).mockResolvedValue({
                id: 'task-1',
                userId: mockUserId,
                status: 'COMPLETED',
                assignedUserId: 'provider-1',
                review: { id: 'existing-review' },
            });

            const request = new NextRequest('http://localhost/api/reviews', {
                method: 'POST',
                body: JSON.stringify({ taskId: 'task-1', rating: 5 }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toContain('already exists');
        });

        it('should create review successfully', async () => {
            (prismaMock.task.findUnique as jest.Mock).mockResolvedValue({
                id: 'task-1',
                userId: mockUserId,
                status: 'COMPLETED',
                assignedUserId: 'provider-1',
                review: null,
            });
            (prismaMock.review.create as jest.Mock).mockResolvedValue({
                id: 'rev-1',
                rating: 5,
                comment: 'Great',
                reviewerId: mockUserId,
                reviewedId: 'provider-1',
                taskId: 'task-1',
                reviewer: { id: mockUserId, fullName: 'Customer' },
            });

            const request = new NextRequest('http://localhost/api/reviews', {
                method: 'POST',
                body: JSON.stringify({ taskId: 'task-1', rating: 5, comment: 'Great' }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(201);
            expect(data.message).toBe('Review submitted successfully');
            expect(data.review).toBeDefined();
            expect(data.review.rating).toBe(5);
            expect(prismaMock.review.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        rating: 5,
                        reviewerId: mockUserId,
                        reviewedId: 'provider-1',
                        taskId: 'task-1',
                    }),
                })
            );
        });
    });
});
