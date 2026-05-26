import { GET, PUT } from '../route';
import { prismaMock } from '../../../../__tests__/mocks/prisma';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';

const req = (method = 'GET') => new Request('http://localhost/api/notifications', { method });

jest.mock('@/lib/auth', () => ({ verifyJWT: jest.fn(), getBearerToken: jest.fn(() => null) }));
jest.mock('next/headers', () => ({ cookies: jest.fn() }));

describe('/api/notifications', () => {
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

            const response = await GET(req());
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.error).toBe('Unauthorized');
        });

        it('should return notifications and unreadCount', async () => {
            const mockNotifications = [
                {
                    id: 'n1',
                    type: 'NEW_OFFER',
                    title: 'New offer',
                    message: 'You have a new offer',
                    isRead: false,
                    createdAt: new Date(),
                },
            ];

            (prismaMock.notification.findMany as jest.Mock).mockResolvedValue(mockNotifications);
            (prismaMock.notification.count as jest.Mock).mockResolvedValue(1);

            const response = await GET(req());
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.notifications).toHaveLength(1);
            expect(data.notifications[0].id).toBe('n1');
            expect(data.notifications[0].type).toBe('NEW_OFFER');
            expect(data.notifications[0].title).toBe('New offer');
            expect(data.unreadCount).toBe(1);
            expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { userId: mockUserId },
                    orderBy: { createdAt: 'desc' },
                    take: 20, // default limit in route
                })
            );
        });
    });

    describe('PUT', () => {
        it('should return 401 if no token', async () => {
            (cookies as jest.Mock).mockResolvedValue({ get: jest.fn(() => undefined) });

            const response = await PUT(req('PUT'));
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.error).toBe('Unauthorized');
        });

        it('should mark all notifications as read', async () => {
            (prismaMock.notification.updateMany as jest.Mock).mockResolvedValue({ count: 5 });

            const response = await PUT(req('PUT'));
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.success).toBe(true);
            expect(prismaMock.notification.updateMany).toHaveBeenCalledWith({
                where: {
                    userId: mockUserId,
                    isRead: false,
                },
                data: { isRead: true },
            });
        });
    });
});
