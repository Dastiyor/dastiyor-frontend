import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { requireAuth } from '@/lib/require-auth';

// POST - Add/Remove favorite
export async function POST(request: Request) {
    try {
        const payload = await requireAuth(request);
        if (!payload || !payload.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { taskId } = body;

        if (!taskId) {
            return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
        }

        const userId = payload.id as string;

        // Check if already favorited
        const existing = await prisma.taskFavorite.findUnique({
            where: {
                userId_taskId: {
                    userId,
                    taskId
                }
            }
        });

        if (existing) {
            // Remove favorite
            await prisma.taskFavorite.delete({
                where: { id: existing.id }
            });
            return NextResponse.json({ message: 'Removed from favorites', isFavorite: false });
        } else {
            // Add favorite
            await prisma.taskFavorite.create({
                data: {
                    userId,
                    taskId
                }
            });
            return NextResponse.json({ message: 'Added to favorites', isFavorite: true });
        }

    } catch (error) {
        console.error('Favorite Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// GET - Check if task is favorited
export async function GET(request: Request) {
    try {
        const payload = await requireAuth(request);
        if (!payload || !payload.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const taskId = searchParams.get('taskId');

        if (!taskId) {
            return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
        }

        const favorite = await prisma.taskFavorite.findUnique({
            where: {
                userId_taskId: {
                    userId: payload.id as string,
                    taskId
                }
            }
        });

        return NextResponse.json({ isFavorite: !!favorite });

    } catch (error) {
        return NextResponse.json({ isFavorite: false });
    }
}
