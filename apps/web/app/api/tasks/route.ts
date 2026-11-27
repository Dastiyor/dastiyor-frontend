import { NextResponse } from 'next/server';
import { looksLikeServiceAd } from '@/lib/service-ad';
import { prisma } from '@/lib/prisma';
import { getTaskFeed } from '@/lib/task-feed';
import type { Prisma } from '@prisma/client';
import { logger } from '@/lib/logger';
import { checkRateLimit, getClientIP, rateLimitExceededResponse } from '@/lib/rate-limit';
import { validateTaskInput, sanitizeString } from '@/lib/validation';
import { CITIES } from '@/lib/config-fallback';
import { getCategories } from '@/lib/categories';
import { logAction, getRequestIP } from '@/lib/audit';
import { requireAuth } from '@/lib/require-auth';
import { needsPhoneVerification, PHONE_VERIFICATION_REQUIRED } from '@/lib/phone-gate';
import { queueTaskAlerts } from '@/lib/task-alerts';

/** GET - Public paginated task list for feed / lazy loading */
export async function GET(request: Request) {
    try {
        const clientIP = getClientIP(request);
        const rateLimit = await checkRateLimit(clientIP, 'api');
        if (!rateLimit.allowed) {
            return rateLimitExceededResponse(rateLimit.resetIn);
        }

        const { searchParams } = new URL(request.url);
        // Favorites are marked for a signed-in caller; the list itself is public.
        const viewer = await requireAuth(request).catch(() => null);

        return NextResponse.json(await getTaskFeed(searchParams, viewer?.id as string | undefined));

    } catch (error) {
        logger.error('Tasks list error', { error: error instanceof Error ? error.message : String(error) });
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        // 1. Authenticate Request
        const payload = await requireAuth(request);
        if (!payload || !payload.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Apply Rate Limiting
        const clientIP = getClientIP(request);
        const rateLimitCheck = await checkRateLimit(clientIP, 'api');
        if (!rateLimitCheck.allowed) {
            return rateLimitExceededResponse(rateLimitCheck.resetIn);
        }

        const author = await prisma.user.findUnique({
            where: { id: payload.id as string },
            // googleId/appleId are what the gate keys on for OAuth accounts
            select: { role: true, phoneVerified: true, googleId: true, appleId: true },
        });
        if (!author) {
            return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
        }

        // Only customers post tasks. The mobile and web UIs hide the entry point
        // for providers, but nothing stopped a direct API call, and the task then
        // showed up in the public feed. Mirrors PROVIDER_REQUIRED in POST /api/responses.
        if (author.role !== 'CUSTOMER') {
            return NextResponse.json(
                { error: 'Публиковать задания могут только заказчики', code: 'CUSTOMER_REQUIRED' },
                { status: 403 }
            );
        }

        // Every user must verify a phone number before posting tasks
        if (needsPhoneVerification(author)) {
            return NextResponse.json(
                { error: 'Подтвердите номер телефона, чтобы публиковать задания', code: PHONE_VERIFICATION_REQUIRED },
                { status: 403 }
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

        // Validate Request using pre-defined schema
        const validation = validateTaskInput({
            title, description, category, city, budgetAmount: amount, urgency,
            budgetType: typeof budget === 'string' ? budget.toLowerCase() : undefined,
            allowedCategories: await getCategories(),
            allowedCities: CITIES,
        });
        if (!validation.isValid) {
            return NextResponse.json(
                { error: validation.errors.join(', ') },
                { status: 400 }
            );
        }

        // 3. Create Task
        // Normalise budget fields: accept {budget:'fixed', amount:200} or legacy {budget:200}
        let resolvedBudgetType: string;
        let resolvedAmount = amount;
        const budgetLower = typeof budget === 'string' ? budget.toLowerCase() : null;
        if (budgetLower === 'fixed' || budgetLower === 'negotiable') {
            resolvedBudgetType = budgetLower;
        } else if (typeof budget === 'number' || (typeof budget === 'string' && !isNaN(Number(budget)))) {
            resolvedBudgetType = 'fixed';
            resolvedAmount = resolvedAmount ?? budget;
        } else {
            resolvedBudgetType = 'negotiable';
        }
        const amountNum = resolvedAmount != null && resolvedAmount !== '' ? parseInt(String(resolvedAmount), 10) : null;
        const task = await prisma.task.create({
            data: {
                title: sanitizeString(title),
                // Optional since Nov 2026; the column is NOT NULL, so no description is ''.
                description: typeof description === 'string' ? sanitizeString(description) : '',
                category,
                subcategory: subcategory ? sanitizeString(subcategory) : null,
                budgetType: resolvedBudgetType,
                budgetAmount: resolvedAmount ? String(resolvedAmount) : null,
                budgetAmountNum: amountNum != null && !isNaN(amountNum) ? amountNum : null,
                city: sanitizeString(city),
                address: address ? sanitizeString(address) : undefined,
                userId: payload.id as string,
                images: images ? JSON.stringify(images) : undefined,
                dueDate: dueDate ? new Date(dueDate) : null,
                urgency: urgency || 'normal', // validated above against URGENCY_VALUES
            },
        });

        logAction({
            action: 'CREATE_TASK',
            userId: payload.id as string,
            entity: 'Task',
            entityId: task.id,
            details: { title, category, city },
            ipAddress: clientIP,
        });

        // The clients warn before posting something that reads like a service ad;
        // record the ones that went out anyway, so they can be reviewed.
        if (looksLikeServiceAd(String(title), String(description ?? ''))) {
            logAction({
                action: 'TASK_LOOKS_LIKE_AD',
                userId: payload.id as string,
                entity: 'Task',
                entityId: task.id,
                ipAddress: clientIP,
            });
        }

        // Paid providers' new-task alerts; runs after the response, never throws.
        queueTaskAlerts(task);

        return NextResponse.json(
            { message: 'Task created successfully', task },
            { status: 201 }
        );

    } catch (error) {
        logger.error('Task Creation Error', { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined });
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }

}
