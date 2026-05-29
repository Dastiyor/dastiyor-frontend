import { GET, POST } from '../route';
import { prismaMock } from '../../../../../__tests__/mocks/prisma';
import { verifyJWTWithVersion } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';



jest.mock('@/lib/auth', () => ({ verifyJWTWithVersion: jest.fn(), getBearerToken: jest.fn(() => null) }));
jest.mock('next/headers', () => ({ cookies: jest.fn() }));

describe('/api/tasks/favorite', () => {
    const mockUserId = 'user-1';
    const mockPayload = { id: mockUserId };

    beforeEach(() => {
        jest.clearAllMocks();
        (cookies as jest.Mock).mockResolvedValue({
            get: jest.fn(() => ({ value: 'token' })),
        });
        (verifyJWTWithVersion as jest.Mock).mockResolvedValue(mockPayload);
    });

    describe('GET', () => {
        it('should return 401 when no token', async () => {
            (cookies as jest.Mock).mockResolvedValue({ get: jest.fn(() => undefined) });

            const request = new NextRequest('http://localhost/api/tasks/favorite?taskId=task-1');

            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.error).toBe('Unauthorized');
        });

        it('should return 400 if taskId is missing', async () => {
            const request = new NextRequest('http://localhost/api/tasks/favorite');

            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Task ID is required');
        });

        it('should return isFavorite true when task is favorited', async () => {
            (prismaMock.taskFavorite.findUnique as jest.Mock).mockResolvedValue({
                id: 'fav-1',
                userId: mockUserId,
                taskId: 'task-1',
            });

            const request = new NextRequest('http://localhost/api/tasks/favorite?taskId=task-1');

            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.isFavorite).toBe(true);
        });

        it('should return isFavorite false when task is not favorited', async () => {
            (prismaMock.taskFavorite.findUnique as jest.Mock).mockResolvedValue(null);

            const request = new NextRequest('http://localhost/api/tasks/favorite?taskId=task-1');

            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.isFavorite).toBe(false);
        });
    });

    describe('POST', () => {
        it('should return 401 if no token', async () => {
            (cookies as jest.Mock).mockResolvedValue({ get: jest.fn(() => undefined) });

            const request = new NextRequest('http://localhost/api/tasks/favorite', {
                method: 'POST',
                body: JSON.stringify({ taskId: 'task-1' }),
            });

            const response = await POST(request);
            expect(response.status).toBe(401);
        });

        it('should return 400 if taskId is missing', async () => {
            const request = new NextRequest('http://localhost/api/tasks/favorite', {
                method: 'POST',
                body: JSON.stringify({}),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Task ID is required');
        });

        it('should add favorite when not already favorited', async () => {
            (prismaMock.taskFavorite.findUnique as jest.Mock).mockResolvedValue(null);
            (prismaMock.taskFavorite.create as jest.Mock).mockResolvedValue({});

            const request = new NextRequest('http://localhost/api/tasks/favorite', {
                method: 'POST',
                body: JSON.stringify({ taskId: 'task-1' }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.isFavorite).toBe(true);
            expect(data.message).toContain('Added');
            expect(prismaMock.taskFavorite.create).toHaveBeenCalledWith({
                data: { userId: mockUserId, taskId: 'task-1' },
            });
        });

        it('should remove favorite when already favorited', async () => {
            (prismaMock.taskFavorite.findUnique as jest.Mock).mockResolvedValue({
                id: 'fav-1',
                userId: mockUserId,
                taskId: 'task-1',
            });
            (prismaMock.taskFavorite.delete as jest.Mock).mockResolvedValue({});

            const request = new NextRequest('http://localhost/api/tasks/favorite', {
                method: 'POST',
                body: JSON.stringify({ taskId: 'task-1' }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.isFavorite).toBe(false);
            expect(data.message).toContain('Removed');
            expect(prismaMock.taskFavorite.delete).toHaveBeenCalledWith({
                where: { id: 'fav-1' },
            });
        });
    });
});
