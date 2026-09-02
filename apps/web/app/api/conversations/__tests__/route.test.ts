import { GET, DELETE } from '../route';
import { prismaMock } from '../../../../__tests__/mocks/prisma';
import { verifyJWTWithVersion } from '@/lib/auth';
import { cookies } from 'next/headers';

const req = () => new Request('http://localhost/api/conversations');

jest.mock('@/lib/auth', () => ({ verifyJWTWithVersion: jest.fn(), getBearerToken: jest.fn(() => null) }));
jest.mock('next/headers', () => ({ cookies: jest.fn() }));

describe('/api/conversations', () => {
    const mockUserId = 'user-1';
    const mockPayload = { id: mockUserId };

    beforeEach(() => {
        jest.clearAllMocks();
        (cookies as jest.Mock).mockResolvedValue({
            get: jest.fn(() => ({ value: 'token' })),
        });
        (verifyJWTWithVersion as jest.Mock).mockResolvedValue(mockPayload);
    });

    it('should return 401 if no token', async () => {
        (cookies as jest.Mock).mockResolvedValue({ get: jest.fn(() => undefined) });

        const response = await GET(req());
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
    });

    it('should return grouped conversations', async () => {
        const mockMessages = [
            {
                id: 'msg-1',
                content: 'Hello',
                senderId: mockUserId,
                receiverId: 'user-2',
                taskId: null,
                isRead: false,
                createdAt: new Date(),
                sender: { id: mockUserId, fullName: 'User 1' },
                receiver: { id: 'user-2', fullName: 'User 2' },
                task: null,
            },
        ];

        (prismaMock.message.findMany as jest.Mock).mockResolvedValue(mockMessages);

        const response = await GET(req());
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.conversations).toBeDefined();
        expect(Array.isArray(data.conversations)).toBe(true);
        expect(prismaMock.message.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    OR: [
                        { senderId: mockUserId, deletedBySender: false },
                        { receiverId: mockUserId, deletedByReceiver: false },
                    ],
                },
                orderBy: { createdAt: 'desc' },
            })
        );
    });

    it('should handle empty conversations', async () => {
        (prismaMock.message.findMany as jest.Mock).mockResolvedValue([]);

        const response = await GET(req());
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.conversations).toEqual([]);
    });

    it('should handle server errors', async () => {
        (prismaMock.message.findMany as jest.Mock).mockRejectedValue(new Error('DB error'));

        const response = await GET(req());
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Internal Server Error');
    });

    describe('DELETE', () => {
        const del = (qs: string) =>
            new Request(`http://localhost/api/conversations?${qs}`, { method: 'DELETE' });

        it('marks the caller\'s copy on both directions of the thread', async () => {
            prismaMock.$transaction.mockResolvedValue([{ count: 2 }, { count: 3 }]);

            const res = await DELETE(del('userId=partner-1&taskId=task-1'));
            const data = await res.json();

            expect(res.status).toBe(200);
            expect(data.count).toBe(5);
            expect(prismaMock.message.updateMany).toHaveBeenCalledWith({
                where: { senderId: mockUserId, receiverId: 'partner-1', taskId: 'task-1' },
                data: { deletedBySender: true },
            });
            expect(prismaMock.message.updateMany).toHaveBeenCalledWith({
                where: { senderId: 'partner-1', receiverId: mockUserId, taskId: 'task-1' },
                data: { deletedByReceiver: true },
            });
        });

        it('scopes an absent taskId to the task-less thread, not every thread', async () => {
            prismaMock.$transaction.mockResolvedValue([{ count: 1 }, { count: 0 }]);

            await DELETE(del('userId=partner-1'));

            expect(prismaMock.message.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: expect.objectContaining({ taskId: null }) })
            );
        });

        it('returns 400 without a partner id', async () => {
            expect((await DELETE(del(''))).status).toBe(400);
        });

        it('returns 404 when the conversation has no messages', async () => {
            prismaMock.$transaction.mockResolvedValue([{ count: 0 }, { count: 0 }]);
            expect((await DELETE(del('userId=partner-1'))).status).toBe(404);
        });

        it('returns 401 when unauthenticated', async () => {
            (verifyJWTWithVersion as jest.Mock).mockResolvedValue(null);
            expect((await DELETE(del('userId=partner-1'))).status).toBe(401);
        });
    });
});
