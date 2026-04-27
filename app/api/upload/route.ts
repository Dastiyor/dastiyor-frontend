import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const TYPE_TO_EXT: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
};
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function POST(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifyJWT(token);
        if (!payload || !payload.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json(
                { error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' },
                { status: 400 }
            );
        }

        if (file.size > MAX_SIZE) {
            return NextResponse.json(
                { error: 'File too large. Maximum size is 5MB.' },
                { status: 400 }
            );
        }

        const extension = TYPE_TO_EXT[file.type];
        const filename = `${payload.id}-${Date.now()}.${extension}`;

        let url: string;

        if (process.env.BLOB_READ_WRITE_TOKEN) {
            // Production: store in Vercel Blob
            const blob = await put(`uploads/${filename}`, file, {
                access: 'public',
                contentType: file.type,
            });
            url = blob.url;
        } else {
            // Development fallback: local filesystem
            const uploadsDir = join(process.cwd(), 'public', 'uploads');
            await mkdir(uploadsDir, { recursive: true });
            const bytes = await file.arrayBuffer();
            await writeFile(join(uploadsDir, filename), Buffer.from(bytes));
            url = `/uploads/${filename}`;
        }

        return NextResponse.json({ url, filename, message: 'File uploaded successfully' });

    } catch (error) {
        console.error('Upload Error:', error);
        return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }
}
