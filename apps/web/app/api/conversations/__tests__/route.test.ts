import { GET } from '../route';
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
                        { senderId: mockUserId },
                        { receiverId: mockUserId },
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
});
