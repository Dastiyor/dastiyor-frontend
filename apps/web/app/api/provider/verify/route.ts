import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';

// POST - Submit verification documents
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

        await prisma.user.update({
            where: { id: user.id },
            data: {
                verificationDocuments: JSON.stringify(documentUrls),
                isVerified: false // Admin needs to approve
            }
        });

        logger.info('Verification documents submitted', { userId: user.id });

        return NextResponse.json({
            message: 'Verification documents submitted. Awaiting admin approval.'
        });

    } catch (error: any) {
        logger.error('Verification submission error', { error: error.message });
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// GET - Check verification status
export async function GET() {
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

    } catch (error: any) {
        logger.error('Get verification status error', { error: error.message });
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
