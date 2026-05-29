import { GET, POST } from '../route';
import { prismaMock } from '../../../../__tests__/mocks/prisma';
import { verifyJWTWithVersion } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

// Mock dependencies


jest.mock('@/lib/auth', () => ({
    verifyJWTWithVersion: jest.fn(),
    getBearerToken: jest.fn(() => null),
}));

jest.mock('next/headers', () => ({
    cookies: jest.fn(),
}));

describe('/api/messages', () => {
    const mockUserId = 'user-1';
    const mockToken = 'valid-token';
    const mockPayload = { id: mockUserId, email: 'test@example.com' };

    beforeEach(() => {
        jest.clearAllMocks();
        (cookies as jest.Mock).mockReturnValue({
            get: jest.fn(() => ({ value: mockToken })),
        });
        (verifyJWTWithVersion as jest.Mock).mockResolvedValue(mockPayload);
    });

    describe('GET', () => {
        it('should return 401 if no token provided', async () => {
            (cookies as jest.Mock).mockReturnValue({
                get: jest.fn(() => undefined),
            });

            const request = new NextRequest('http://localhost/api/messages?userId=user-2');
            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.error).toBe('Unauthorized');
        });

        it('should return 400 if userId parameter is missing', async () => {
            const request = new NextRequest('http://localhost/api/messages');
            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Missing userId parameter');
        });

        it('should fetch messages between two users', async () => {
            const mockMessages = [
                {
                    id: 'msg-1',
                    content: 'Hello',
                    senderId: mockUserId,
                    receiverId: 'user-2',
                    createdAt: new Date(),
                    sender: { id: mockUserId, fullName: 'User 1' },
                },
            ];

            (prismaMock.message.findMany as jest.Mock).mockResolvedValue(mockMessages);
            (prismaMock.message.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

            const request = new NextRequest('http://localhost/api/messages?userId=user-2');
            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.messages).toBeDefined();
            expect(data.messages).toHaveLength(1);
            expect(prismaMock.message.findMany).toHaveBeenCalled();
        });

        it('should filter messages by taskId when provided', async () => {
            const request = new NextRequest('http://localhost/api/messages?userId=user-2&taskId=task-1');
            await GET(request);

            expect(prismaMock.message.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        taskId: 'task-1',
                    }),
                })
            );
        });

        it('should mark messages as read', async () => {
            (prismaMock.message.findMany as jest.Mock).mockResolvedValue([]);
            (prismaMock.message.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

            const request = new NextRequest('http://localhost/api/messages?userId=user-2');
            await GET(request);

            expect(prismaMock.message.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: {
                        receiverId: mockUserId,
                        senderId: 'user-2',
                        isRead: false,
                    },
                    data: { isRead: true },
                })
            );
        });
    });

    describe('POST', () => {
        it('should return 401 if no token provided', async () => {
            (cookies as jest.Mock).mockReturnValue({
                get: jest.fn(() => undefined),
            });

            const request = new NextRequest('http://localhost/api/messages', {
                method: 'POST',
                body: JSON.stringify({
                    receiverId: 'user-2',
                    content: 'Hello',
                }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.error).toBe('Unauthorized');
        });

        it('should return 400 if receiverId is missing', async () => {
            const request = new NextRequest('http://localhost/api/messages', {
                method: 'POST',
                body: JSON.stringify({
                    content: 'Hello',
                }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Missing receiverId');
        });

        it('should return 400 if message has no content or image', async () => {
            const request = new NextRequest('http://localhost/api/messages', {
                method: 'POST',
                body: JSON.stringify({
                    receiverId: 'user-2',
                }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Message must have content or image');
        });

        it('should return 400 if trying to message yourself', async () => {
            const request = new NextRequest('http://localhost/api/messages', {
                method: 'POST',
                body: JSON.stringify({
                    receiverId: mockUserId,
                    content: 'Hello',
                }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Cannot message yourself');
        });

        it('should create a message successfully', async () => {
            const mockMessage = {
                id: 'msg-1',
                content: 'Hello',
                senderId: mockUserId,
                receiverId: 'user-2',
                createdAt: new Date(),
                sender: { id: mockUserId, fullName: 'User 1' },
            };

            (prismaMock.message.create as jest.Mock).mockResolvedValue(mockMessage);

            const request = new NextRequest('http://localhost/api/messages', {
                method: 'POST',
                body: JSON.stringify({
                    receiverId: 'user-2',
                    content: 'Hello',
                }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(201);
            expect(data.message).toBeDefined();
            expect(data.message.content).toBe('Hello');
            expect(prismaMock.message.create).toHaveBeenCalled();
        });

        it('should create message with imageUrl', async () => {
            const mockMessage = {
                id: 'msg-1',
                content: '',
                imageUrl: 'https://example.com/image.jpg',
                senderId: mockUserId,
                receiverId: 'user-2',
                createdAt: new Date(),
                sender: { id: mockUserId, fullName: 'User 1' },
            };

            (prismaMock.message.create as jest.Mock).mockResolvedValue(mockMessage);

            const request = new NextRequest('http://localhost/api/messages', {
                method: 'POST',
                body: JSON.stringify({
                    receiverId: 'user-2',
                    imageUrl: 'https://example.com/image.jpg',
                }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(201);
            expect(data.message.imageUrl).toBe('https://example.com/image.jpg');
        });
    });
});
