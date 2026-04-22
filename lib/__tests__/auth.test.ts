/* eslint-disable @typescript-eslint/no-require-imports */
import { signJWT, verifyJWT } from '../auth';

describe('Auth Utilities', () => {
    const testPayload = {
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'CUSTOMER'
    };

    describe('signJWT', () => {
        it('should create a valid JWT token', async () => {
            const token = await signJWT(testPayload);
            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            // Mock returns 'mock.jwt.token' which has 3 parts
            expect(token.split('.')).toHaveLength(3);
        });

        it('should call SignJWT with correct parameters', async () => {
            await signJWT(testPayload);
            const { SignJWT } = require('jose');
            expect(SignJWT).toHaveBeenCalled();
        });
    });

    describe('verifyJWT', () => {
        it('should verify a valid JWT token', async () => {
            const token = await signJWT(testPayload);
            const verified = await verifyJWT(token);
            
            expect(verified).toBeDefined();
            expect(verified?.id).toBe(testPayload.id);
            expect(verified?.email).toBe(testPayload.email);
            expect(verified?.role).toBe(testPayload.role);
        });

        it('should return null for invalid tokens', async () => {
            const { jwtVerify } = require('jose');
            (jwtVerify as jest.Mock).mockRejectedValueOnce(new Error('Invalid'));
            
            const verified = await verifyJWT('invalid');
            expect(verified).toBeNull();
        });

        it('should return null for empty token', async () => {
            const { jwtVerify } = require('jose');
            (jwtVerify as jest.Mock).mockRejectedValueOnce(new Error('Invalid'));
            
            const verified = await verifyJWT('');
            expect(verified).toBeNull();
        });

        it('should return null for malformed token', async () => {
            const { jwtVerify } = require('jose');
            (jwtVerify as jest.Mock).mockRejectedValueOnce(new Error('Invalid'));
            
            const verified = await verifyJWT('not-valid');
            expect(verified).toBeNull();
        });
    });

    describe('JWT round trip', () => {
        it('should sign and verify payload correctly', async () => {
            const payload = {
                id: 'user-123',
                email: 'user@test.com',
                role: 'PROVIDER'
            };

            const { jwtVerify } = require('jose');
            (jwtVerify as jest.Mock).mockResolvedValueOnce({ payload });

            const token = await signJWT(payload);
            const verified = await verifyJWT(token);

            expect(verified).toBeDefined();
            expect(verified?.id).toBe(payload.id);
            expect(verified?.email).toBe(payload.email);
            expect(verified?.role).toBe(payload.role);
        });
    });
});
