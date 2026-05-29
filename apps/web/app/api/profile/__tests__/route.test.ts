import { GET, PUT } from '../route';
import { prismaMock } from '../../../../__tests__/mocks/prisma';
import { verifyJWTWithVersion } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

jest.mock('@/lib/auth', () => ({
    verifyJWTWithVersion: jest.fn(),
    getBearerToken: jest.fn(() => null),
}));

jest.mock('next/headers', () => ({
    cookies: jest.fn(),
}));

const mockUser = {
    id: 'user-1',
    fullName: 'Ali Karimov',
    email: 'ali@test.com',
    phone: '+992901234567',
    bio: 'Experienced plumber',
    skills: 'Plumbing, Repair',
    avatar: null,
    role: 'PROVIDER',
    createdAt: new Date(),
};

describe('/api/profile', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (cookies as jest.Mock).mockResolvedValue({
            get: jest.fn(() => ({ value: 'valid-token' })),
        });
        (verifyJWTWithVersion as jest.Mock).mockResolvedValue({ id: 'user-1' });
    });

    describe('GET', () => {
        it('returns 401 when no token', async () => {
            (cookies as jest.Mock).mockResolvedValue({ get: jest.fn(() => undefined) });

            const request = new Request('http://localhost/api/profile');
            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.error).toBe('Unauthorized');
        });

        it('returns 404 when user not found', async () => {
            prismaMock.user.findUnique.mockResolvedValue(null);

            const request = new Request('http://localhost/api/profile');
            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(404);
            expect(data.error).toBe('User not found');
        });

        it('returns user profile on success', async () => {
            prismaMock.user.findUnique.mockResolvedValue(mockUser as any);

            const request = new Request('http://localhost/api/profile');
            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.user.id).toBe('user-1');
            expect(data.user.fullName).toBe('Ali Karimov');
            expect(data.user.email).toBe('ali@test.com');
        });

        it('returns 500 on database error', async () => {
            prismaMock.user.findUnique.mockRejectedValue(new Error('DB error'));

            const request = new Request('http://localhost/api/profile');
            const response = await GET(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Internal Server Error');
        });
    });

    describe('PUT', () => {
        const makeRequest = (body: object) =>
            new NextRequest('http://localhost/api/profile', {
                method: 'PUT',
                body: JSON.stringify(body),
            });

        it('returns 401 when no token', async () => {
            (cookies as jest.Mock).mockResolvedValue({ get: jest.fn(() => undefined) });

            const response = await PUT(makeRequest({ fullName: 'Ali' }));
            expect(response.status).toBe(401);
        });

        it('returns 400 when fullName is missing', async () => {
            const response = await PUT(makeRequest({ bio: 'Some bio' }));
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Name must be at least 2 characters');
        });

        it('returns 400 when fullName is single character', async () => {
            const response = await PUT(makeRequest({ fullName: 'A' }));
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Name must be at least 2 characters');
        });

        it('returns 400 when fullName is only whitespace', async () => {
            const response = await PUT(makeRequest({ fullName: '  ' }));
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Name must be at least 2 characters');
        });

        it('updates profile and returns updated user', async () => {
            const updatedUser = { ...mockUser, bio: 'Updated bio', skills: 'New skills' };
            prismaMock.user.update.mockResolvedValue(updatedUser as any);

            const response = await PUT(makeRequest({
                fullName: 'Ali Karimov',
                bio: 'Updated bio',
                skills: 'New skills',
            }));
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.message).toBe('Profile updated successfully');
            expect(data.user).toBeDefined();
            expect(prismaMock.user.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { id: 'user-1' },
                    data: expect.objectContaining({ fullName: 'Ali Karimov' }),
                })
            );
        });

        it('trims fullName before storing', async () => {
            prismaMock.user.update.mockResolvedValue(mockUser as any);

            await PUT(makeRequest({ fullName: '  Ali  ' }));

            const updateCall = prismaMock.user.update.mock.calls[0][0];
            expect(updateCall.data.fullName).toBe('Ali');
        });

        it('stores null for empty optional fields', async () => {
            prismaMock.user.update.mockResolvedValue(mockUser as any);

            await PUT(makeRequest({ fullName: 'Ali', phone: '', bio: '' }));

            const updateCall = prismaMock.user.update.mock.calls[0][0];
            expect(updateCall.data.phone).toBeNull();
            expect(updateCall.data.bio).toBeNull();
        });

        it('returns 500 on database error', async () => {
            prismaMock.user.update.mockRejectedValue(new Error('DB error'));

            const response = await PUT(makeRequest({ fullName: 'Ali' }));
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Internal Server Error');
        });

        describe('email change', () => {
            const hashedPassword = bcrypt.hashSync('correct-password', 10);
            const userWithPassword = { ...mockUser, password: hashedPassword };

            it('returns 400 when email change attempted without currentPassword', async () => {
                const response = await PUT(makeRequest({ fullName: 'Ali', email: 'new@test.com' }));
                const data = await response.json();

                expect(response.status).toBe(400);
                expect(data.error).toBe('Enter your current password to confirm email change');
            });

            it('returns 400 when currentPassword is wrong', async () => {
                prismaMock.user.findUnique
                    .mockResolvedValueOnce(userWithPassword as any);

                const response = await PUT(makeRequest({
                    fullName: 'Ali',
                    email: 'new@test.com',
                    currentPassword: 'wrong-password',
                }));
                const data = await response.json();

                expect(response.status).toBe(400);
                expect(data.error).toBe('Current password is incorrect');
            });

            it('returns 400 when account has no password (social sign-in)', async () => {
                prismaMock.user.findUnique
                    .mockResolvedValueOnce({ ...mockUser, password: null } as any);

                const response = await PUT(makeRequest({
                    fullName: 'Ali',
                    email: 'new@test.com',
                    currentPassword: 'anything',
                }));
                const data = await response.json();

                expect(response.status).toBe(400);
                expect(data.error).toBe('This account uses social sign-in and cannot change email this way');
            });

            it('returns 409 when email already taken by another user', async () => {
                prismaMock.user.findUnique
                    .mockResolvedValueOnce(userWithPassword as any)  // password check
                    .mockResolvedValueOnce({ id: 'other-user' } as any); // email uniqueness

                const response = await PUT(makeRequest({
                    fullName: 'Ali',
                    email: 'taken@test.com',
                    currentPassword: 'correct-password',
                }));
                const data = await response.json();

                expect(response.status).toBe(409);
                expect(data.error).toBe('This email is already in use');
            });

            it('updates email when currentPassword is correct', async () => {
                prismaMock.user.findUnique
                    .mockResolvedValueOnce(userWithPassword as any)  // password check
                    .mockResolvedValueOnce(null);                     // email uniqueness
                const updatedUser = { ...mockUser, email: 'new@test.com' };
                prismaMock.user.update.mockResolvedValue(updatedUser as any);

                const response = await PUT(makeRequest({
                    fullName: 'Ali Karimov',
                    email: 'new@test.com',
                    currentPassword: 'correct-password',
                }));
                const data = await response.json();

                expect(response.status).toBe(200);
                expect(data.user.email).toBe('new@test.com');
                expect(prismaMock.user.update).toHaveBeenCalledWith(
                    expect.objectContaining({
                        data: expect.objectContaining({ email: 'new@test.com' }),
                    })
                );
            });

            it('does not require currentPassword for non-email profile updates', async () => {
                prismaMock.user.update.mockResolvedValue(mockUser as any);

                const response = await PUT(makeRequest({
                    fullName: 'Ali Karimov',
                    bio: 'Updated bio',
                }));

                expect(response.status).toBe(200);
                expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
            });
        });
    });
});
