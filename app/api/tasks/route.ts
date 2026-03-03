import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
    try {
        // 1. Authenticate Request
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        logger.debug('API /tasks request', { hasToken: !!token });

        if (!token) {
            return NextResponse.json(
                { error: `Unauthorized: Please log in. Cookies: ${cookieStore.getAll().map(c => c.name).join(', ')}` },
                { status: 401 }
            );
        }

        const payload = await verifyJWT(token);
        if (!payload || !payload.id) {
            return NextResponse.json(
                { error: 'Unauthorized: Invalid token' },
                { status: 401 }
            );
        }

        // 2. Parse Body
        const body = await request.json();
        const {
            title,
            description,
            category,
            subcategory,
            budget,
            amount,
            city,
            address,
            images,
            dueDate,
            urgency
        } = body;

        if (!title || !description || !category) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // 3. Create Task
        console.log('Creating task with data:', {
            title, description, category, budget, amount, userId: payload.id
        });

        const amountNum = amount != null && amount !== '' ? parseInt(String(amount), 10) : null;
        const task = await prisma.task.create({
            data: {
                title,
                description,
                category,
                subcategory: subcategory || null,
                budgetType: String(budget),
                budgetAmount: amount ? String(amount) : null,
                budgetAmountNum: amountNum != null && !isNaN(amountNum) ? amountNum : null,
                city,
                address,
                userId: payload.id as string,
                images: images ? JSON.stringify(images) : undefined,
                dueDate: dueDate ? new Date(dueDate) : null,
                urgency: urgency || 'normal',
            },
        });

        return NextResponse.json(
            { message: 'Task created successfully', task },
            { status: 201 }
        );

    } catch (error: any) {
        logger.error('Task Creation Error', { error: error.message, stack: error.stack });
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }

}
