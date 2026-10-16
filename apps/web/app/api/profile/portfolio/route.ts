import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAction, getRequestIP } from '@/lib/audit';
import { MAX_PROJECTS, parseProject, requireProvider } from '@/lib/portfolio';

const PROJECT_SELECT = { id: true, title: true, description: true, images: true, order: true } as const;

// GET - own portfolio projects
export async function GET(request: Request) {
    try {
        const auth = await requireProvider(request);
        if ('response' in auth) return auth.response;

        const projects = await prisma.portfolioProject.findMany({
            where: { userId: auth.userId },
            orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
            select: PROJECT_SELECT,
        });
        return NextResponse.json({ projects });
    } catch (error) {
        console.error('Get Portfolio Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST - add a project at the end of the list
export async function POST(request: Request) {
    try {
        const auth = await requireProvider(request);
        if ('response' in auth) return auth.response;

        const parsed = parseProject(await request.json());
        if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

        const count = await prisma.portfolioProject.count({ where: { userId: auth.userId } });
        if (count >= MAX_PROJECTS) {
            return NextResponse.json({ error: 'Не больше 20 проектов в портфолио' }, { status: 400 });
        }

        const project = await prisma.portfolioProject.create({
            data: { userId: auth.userId, ...parsed.value, order: count },
            select: PROJECT_SELECT,
        });

        logAction({
            action: 'UPDATE_PROFILE',
            userId: auth.userId,
            entity: 'PortfolioProject',
            entityId: project.id,
            ipAddress: getRequestIP(request),
        });

        return NextResponse.json({ project }, { status: 201 });
    } catch (error) {
        console.error('Create Portfolio Project Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// PATCH - reorder: body { order: string[] } of project ids, first = top
export async function PATCH(request: Request) {
    try {
        const auth = await requireProvider(request);
        if ('response' in auth) return auth.response;

        const { order } = await request.json();
        if (!Array.isArray(order) || !order.every(id => typeof id === 'string')) {
            return NextResponse.json({ error: 'Некорректный порядок' }, { status: 400 });
        }

        const owned = new Set(
            (await prisma.portfolioProject.findMany({ where: { userId: auth.userId }, select: { id: true } }))
                .map(p => p.id)
        );
        const ids = (order as string[]).filter(id => owned.has(id));

        await prisma.$transaction(ids.map((id, index) =>
            prisma.portfolioProject.update({ where: { id }, data: { order: index } })
        ));

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('Reorder Portfolio Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
