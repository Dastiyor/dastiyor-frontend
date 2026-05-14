import { GET } from '../route';
import { prismaMock } from '../../../../../__tests__/mocks/prisma';

describe('/api/tasks/[id]', () => {
    const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

    const mockTask = {
        id: 'task-1',
        title: 'Fix plumbing',
        description: 'Pipe leak in kitchen',
        category: 'Ремонт',
        budgetType: 'fixed',
        budgetAmount: '500',
        city: 'Dushanbe',
        address: 'ул. Рудаки 10',
        images: JSON.stringify(['img1.jpg', 'img2.jpg']),
        urgency: 'urgent',
        dueDate: new Date('2026-06-01'),
        status: 'OPEN',
        createdAt: new Date('2026-05-01'),
        user: { id: 'user-1', fullName: 'Ali Karimov', avatar: null },
        _count: { responses: 3 },
        review: null,
    };

    it('returns 404 when task does not exist', async () => {
        prismaMock.task.findUnique.mockResolvedValue(null);

        const request = new Request('http://localhost/api/tasks/nonexistent');
        const response = await GET(request, makeParams('nonexistent'));
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe('Task not found');
    });

    it('returns task with all fields when found', async () => {
        prismaMock.task.findUnique.mockResolvedValue(mockTask as any);

        const request = new Request('http://localhost/api/tasks/task-1');
        const response = await GET(request, makeParams('task-1'));
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.id).toBe('task-1');
        expect(data.title).toBe('Fix plumbing');
        expect(data.status).toBe('OPEN');
        expect(data.responseCount).toBe(3);
        expect(data.customer).toEqual({ id: 'user-1', fullName: 'Ali Karimov', avatar: null });
    });

    it('parses images JSON string into array', async () => {
        prismaMock.task.findUnique.mockResolvedValue(mockTask as any);

        const request = new Request('http://localhost/api/tasks/task-1');
        const response = await GET(request, makeParams('task-1'));
        const data = await response.json();

        expect(data.images).toEqual(['img1.jpg', 'img2.jpg']);
    });

    it('returns empty array when images is null', async () => {
        prismaMock.task.findUnique.mockResolvedValue({ ...mockTask, images: null } as any);

        const request = new Request('http://localhost/api/tasks/task-1');
        const response = await GET(request, makeParams('task-1'));
        const data = await response.json();

        expect(data.images).toEqual([]);
    });

    it('formats fixed budget as price string', async () => {
        prismaMock.task.findUnique.mockResolvedValue(mockTask as any);

        const request = new Request('http://localhost/api/tasks/task-1');
        const response = await GET(request, makeParams('task-1'));
        const data = await response.json();

        expect(data.budget).toBe('500 TJS');
    });

    it('formats negotiable budget as Договорная', async () => {
        prismaMock.task.findUnique.mockResolvedValue({
            ...mockTask,
            budgetType: 'negotiable',
        } as any);

        const request = new Request('http://localhost/api/tasks/task-1');
        const response = await GET(request, makeParams('task-1'));
        const data = await response.json();

        expect(data.budget).toBe('Договорная');
    });

    it('sets hasReview true when review exists', async () => {
        prismaMock.task.findUnique.mockResolvedValue({
            ...mockTask,
            review: { id: 'rev-1' },
        } as any);

        const request = new Request('http://localhost/api/tasks/task-1');
        const response = await GET(request, makeParams('task-1'));
        const data = await response.json();

        expect(data.hasReview).toBe(true);
    });

    it('sets hasReview false when no review', async () => {
        prismaMock.task.findUnique.mockResolvedValue(mockTask as any);

        const request = new Request('http://localhost/api/tasks/task-1');
        const response = await GET(request, makeParams('task-1'));
        const data = await response.json();

        expect(data.hasReview).toBe(false);
    });

    it('returns 500 on database error', async () => {
        prismaMock.task.findUnique.mockRejectedValue(new Error('DB error'));

        const request = new Request('http://localhost/api/tasks/task-1');
        const response = await GET(request, makeParams('task-1'));
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Internal Server Error');
    });
});
