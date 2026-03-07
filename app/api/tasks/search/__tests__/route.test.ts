import { GET } from '../route';
import { prismaMock } from '../../../../../__tests__/mocks/prisma';
import { NextRequest } from 'next/server';



describe('/api/tasks/search', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return 400 if query is missing or shorter than 2 characters', async () => {
        const req1 = new NextRequest('http://localhost/api/tasks/search');
        const res1 = await GET(req1);
        expect(res1.status).toBe(400);
        expect((await res1.json()).error).toContain('at least 2 characters');

        const req2 = new NextRequest('http://localhost/api/tasks/search?q=a');
        const res2 = await GET(req2);
        expect(res2.status).toBe(400);
    });

    it('should search tasks by query', async () => {
        const mockTasks = [
            {
                id: 'task-1',
                title: 'Cleaning service',
                description: 'Need cleaning',
                category: 'Cleaning',
                status: 'OPEN',
                _count: { responses: 2 },
                user: { fullName: 'John' },
            },
        ];

        (prismaMock.task.findMany as jest.Mock).mockResolvedValue(mockTasks);
        (prismaMock.task.count as jest.Mock).mockResolvedValue(1);

        const request = new NextRequest('http://localhost/api/tasks/search?q=cleaning');

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.tasks).toHaveLength(1);
        expect(data.pagination).toBeDefined();
        expect(data.pagination.page).toBe(1);
        expect(data.pagination.total).toBe(1);
        expect(prismaMock.task.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    status: 'OPEN',
                    OR: expect.any(Array),
                }),
                skip: 0,
                take: 20,
            })
        );
    });

    it('should filter by category when provided', async () => {
        (prismaMock.task.findMany as jest.Mock).mockResolvedValue([]);
        (prismaMock.task.count as jest.Mock).mockResolvedValue(0);

        const request = new NextRequest('http://localhost/api/tasks/search?q=clean&category=Cleaning');

        await GET(request);

        expect(prismaMock.task.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    category: 'Cleaning',
                }),
            })
        );
    });

    it('should filter by city when provided', async () => {
        (prismaMock.task.findMany as jest.Mock).mockResolvedValue([]);
        (prismaMock.task.count as jest.Mock).mockResolvedValue(0);

        const request = new NextRequest('http://localhost/api/tasks/search?q=task&city=Dushanbe');

        await GET(request);

        expect(prismaMock.task.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    city: expect.objectContaining({ contains: 'Dushanbe', mode: 'insensitive' }),
                }),
            })
        );
    });

    it('should support pagination via page and limit', async () => {
        (prismaMock.task.findMany as jest.Mock).mockResolvedValue([]);
        (prismaMock.task.count as jest.Mock).mockResolvedValue(50);

        const request = new NextRequest('http://localhost/api/tasks/search?q=test&page=2&limit=10');

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.pagination.page).toBe(2);
        expect(data.pagination.limit).toBe(10);
        expect(data.pagination.totalPages).toBe(5);
        expect(prismaMock.task.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                skip: 10,
                take: 10,
            })
        );
    });

    it('should handle server errors', async () => {
        (prismaMock.task.findMany as jest.Mock).mockRejectedValue(new Error('DB error'));

        const request = new NextRequest('http://localhost/api/tasks/search?q=test');

        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Search failed');
    });
});
