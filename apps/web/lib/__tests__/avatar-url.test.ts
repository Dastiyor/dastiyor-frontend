import { isSafeAvatarUrl } from '../avatar-url';

describe('isSafeAvatarUrl', () => {
    const env = { ...process.env };
    afterEach(() => { process.env = { ...env }; });

    it('accepts our storage hosts and refuses anything else', () => {
        expect(isSafeAvatarUrl('https://abc.public.blob.vercel-storage.com/uploads/a.png')).toBe(true);
        expect(isSafeAvatarUrl('https://evil.example.com/a.png')).toBe(false);
        expect(isSafeAvatarUrl('http://abc.public.blob.vercel-storage.com/a.png')).toBe(false);
    });

    it('accepts a local /uploads file only where /api/upload writes them (no Blob store, not on Vercel)', () => {
        delete process.env.BLOB_READ_WRITE_TOKEN;
        delete process.env.VERCEL;
        expect(isSafeAvatarUrl('/uploads/user-1-1700000000000.png')).toBe(true);
        expect(isSafeAvatarUrl('/uploads/../secret.png')).toBe(false);
        expect(isSafeAvatarUrl('//evil.example.com/uploads/a.png')).toBe(false);

        process.env.VERCEL = '1';
        expect(isSafeAvatarUrl('/uploads/user-1-1700000000000.png')).toBe(false);
        delete process.env.VERCEL;
        process.env.BLOB_READ_WRITE_TOKEN = 'token';
        expect(isSafeAvatarUrl('/uploads/user-1-1700000000000.png')).toBe(false);
    });
});
