import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAction, getRequestIP } from '@/lib/audit';
import { parseProject, requireProvider } from '@/lib/portfolio';

type Params = { params: Promise<{ id: string }> };

// PUT - edit an own project
export async function PUT(request: Request, { params }: Params) {
    try {
        const auth = await requireProvider(request);
        if ('response' in auth) return auth.response;
        const { id } = await params;

        const parsed = parseProject(await request.json());
        if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

        const existing = await prisma.portfolioProject.findFirst({ where: { id, userId: auth.userId }, select: { id: true } });
        if (!existing) return NextResponse.json({ error: 'Проект не найден' }, { status: 404 });

        const project = await prisma.portfolioProject.update({
            where: { id },
            data: parsed.value,
            select: { id: true, title: true, description: true, images: true, order: true },
        });
        return NextResponse.json({ project });
    } catch (error) {
        console.error('Update Portfolio Project Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE - remove an own project
export async function DELETE(request: Request, { params }: Params) {
    try {
        const auth = await requireProvider(request);
        if ('response' in auth) return auth.response;
        const { id } = await params;

        const { count } = await prisma.portfolioProject.deleteMany({ where: { id, userId: auth.userId } });
        if (count === 0) return NextResponse.json({ error: 'Проект не найден' }, { status: 404 });

        logAction({
            action: 'UPDATE_PROFILE',
            userId: auth.userId,
            entity: 'PortfolioProject',
            entityId: id,
            ipAddress: getRequestIP(request),
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Delete Portfolio Project Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
