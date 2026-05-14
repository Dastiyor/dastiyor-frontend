import { GET } from '../route';
import { prismaMock } from '../../../../../../__tests__/mocks/prisma';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';

jest.mock('@/lib/auth', () => ({
    verifyJWT: jest.fn(),
    getBearerToken: jest.fn(() => null),
}));

jest.mock('next/headers', () => ({
    cookies: jest.fn(),
}));

const mockCustomerId = 'customer-1';
const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

const mockResponses = [
    {
        id: 'resp-1',
        message: 'I can fix this quickly',
        price: '500',
        estimatedTime: '2 days',
        status: 'PENDING',
        createdAt: new Date('2026-05-01'),
        user: { id: 'provider-1', fullName: 'Ahmad Soliev', avatar: null },
    },
    {
        id: 'resp-2',
        message: 'I have 5 years of experience',
        price: '700',
        estimatedTime: '3 days',
        status: 'ACCEPTED',
        createdAt: new Date('2026-05-02'),
        user: { id: 'provider-2', fullName: 'Behruz Nazarov', avatar: null },
    },
];

describe('/api/tasks/[id]/responses', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (cookies as jest.Mock).mockResolvedValue({
            get: jest.fn(() => ({ value: 'valid-token' })),
        });
        (verifyJWT as jest.Mock).mockResolvedValue({ id: mockCustomerId });
    });

    it('returns 401 when no token', async () => {
        (cookies as jest.Mock).mockResolvedValue({ get: jest.fn(() => undefined) });

        const request = new Request('http://localhost/api/tasks/task-1/responses');
        const response = await GET(request, makeParams('task-1'));
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
    });

    it('returns 404 when task not found', async () => {
        prismaMock.task.findUnique.mockResolvedValue(null);

        const request = new Request('http://localhost/api/tasks/nonexistent/responses');
        const response = await GET(request, makeParams('nonexistent'));
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe('Task not found');
    });

    it('returns 403 when user does not own the task', async () => {
        prismaMock.task.findUnique.mockResolvedValue({ userId: 'other-user' } as any);

        const request = new Request('http://localhost/api/tasks/task-1/responses');
        const response = await GET(request, makeParams('task-1'));
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toBe('Forbidden');
    });

    it('returns list of responses for task owner', async () => {
        prismaMock.task.findUnique.mockResolvedValue({ userId: mockCustomerId } as any);
        prismaMock.response.findMany.mockResolvedValue(mockResponses as any);

        const request = new Request('http://localhost/api/tasks/task-1/responses');
        const response = await GET(request, makeParams('task-1'));
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.responses).toHaveLength(2);
    });

    it('maps provider user info to provider field', async () => {
        prismaMock.task.findUnique.mockResolvedValue({ userId: mockCustomerId } as any);
        prismaMock.response.findMany.mockResolvedValue([mockResponses[0]] as any);

        const request = new Request('http://localhost/api/tasks/task-1/responses');
        const response = await GET(request, makeParams('task-1'));
        const data = await response.json();

        const resp = data.responses[0];
        expect(resp.provider).toEqual({ id: 'provider-1', fullName: 'Ahmad Soliev', avatar: null });
        expect(resp.message).toBe('I can fix this quickly');
        expect(resp.price).toBe('500');
        expect(resp.status).toBe('PENDING');
    });

    it('returns empty array when task has no responses', async () => {
        prismaMock.task.findUnique.mockResolvedValue({ userId: mockCustomerId } as any);
        prismaMock.response.findMany.mockResolvedValue([]);

        const request = new Request('http://localhost/api/tasks/task-1/responses');
        const response = await GET(request, makeParams('task-1'));
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.responses).toHaveLength(0);
    });

    it('returns 500 on database error', async () => {
        prismaMock.task.findUnique.mockRejectedValue(new Error('DB error'));

        const request = new Request('http://localhost/api/tasks/task-1/responses');
        const response = await GET(request, makeParams('task-1'));
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Internal Server Error');
    });
});
