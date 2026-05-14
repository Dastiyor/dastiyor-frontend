import { signJWT, verifyJWT } from '@/lib/auth';

describe('Authentication Utilities', () => {
    it('should sign and verify a JWT token successfully', async () => {
        const payload = { userId: '123', role: 'CUSTOMER' };
        const token = await signJWT(payload);
        expect(typeof token).toBe('string');

        // Due to the global jest mock on jose, signJWT will return 'mock.jwt.token'
        // and verifyJWT will return the mock payload:
        // { payload: { id: 'test-user-id', ... } }
        expect(token).toBe('mock.jwt.token');

        const decoded = await verifyJWT(token);
        expect(decoded).toMatchObject({
            id: 'test-user-id',
            email: 'test@example.com',
            role: 'CUSTOMER'
        });
    });

    it('should return null for an invalid token', async () => {
        // According to mock, a completely arbitrary invalid string throws an error
        const decoded = await verifyJWT('invalid_jwt_token');
        expect(decoded).toBeNull();
    });
});
