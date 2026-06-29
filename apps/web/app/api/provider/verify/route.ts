import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { requireAuth } from '@/lib/require-auth';

// POST - Submit verification documents
export async function POST(request: Request) {
    try {
        const payload = await requireAuth(request);
        if (!payload || !payload.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: payload.id as string }
        });

        if (!user || user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Only providers can verify' }, { status: 403 });
        }

        const body = await request.json();
        const { documentUrls } = body;

        if (!documentUrls || !Array.isArray(documentUrls) || documentUrls.length === 0) {
            return NextResponse.json({ error: 'Document URLs required' }, { status: 400 });
        }

        // Allow only valid HTTPS URLs to prevent storage of arbitrary/malicious content
        const validUrls = (documentUrls as unknown[]).filter((url): url is string => {
            if (typeof url !== 'string') return false;
            try {
                const parsed = new URL(url);
                return parsed.protocol === 'https:';
            } catch { return false; }
        });

        if (validUrls.length === 0) {
            return NextResponse.json(
                { error: 'At least one valid HTTPS document URL is required' },
                { status: 400 }
            );
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                verificationDocuments: JSON.stringify(validUrls),
                isVerified: false // Admin needs to approve
            }
        });

        logger.info('Verification documents submitted', { userId: user.id });

        return NextResponse.json({
            message: 'Verification documents submitted. Awaiting admin approval.'
        });

    } catch (error) {
        logger.error('Verification submission error', { error: error instanceof Error ? error.message : String(error) });
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// GET - Check verification status
export async function GET(request: Request) {
    try {
        const payload = await requireAuth(request);
        if (!payload || !payload.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: payload.id as string },
            select: { isVerified: true, verificationDocuments: true }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json({
            isVerified: user.isVerified,
            hasDocuments: !!user.verificationDocuments,
            documents: user.verificationDocuments ? JSON.parse(user.verificationDocuments) : []
        });

    } catch (error) {
        logger.error('Get verification status error', { error: error instanceof Error ? error.message : String(error) });
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
