import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { checkRateLimit, rateLimitExceededResponse } from '@/lib/rate-limit';
import { getCategories } from '@/lib/categories';
import { CITIES } from '@/lib/config-fallback';
import { getCompany } from '@/lib/company';
import { sendSourcingRequestEmail } from '@/lib/notifications/email';
import { detectSpam, isValidEmail, isValidPhone, normalizePhone, sanitizeString } from '@/lib/validation';

const bad = (error: string) => NextResponse.json({ error }, { status: 400 });
const isInt = (v: unknown, min: number, max: number) => Number.isInteger(v) && (v as number) >= min && (v as number) <= max;

// POST - a company asks the team to find professionals
export async function POST(request: Request) {
    try {
        const payload = await requireAuth(request);
        if (!payload || !payload.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const userId = payload.id as string;

        const limit = await checkRateLimit(`sourcing:${userId}`, 'sourcing');
        if (!limit.allowed) return rateLimitExceededResponse(limit.resetIn);

        const b = await request.json();
        const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

        if (!(await getCategories()).includes(b.category)) return bad('Неизвестная категория');
        if (!CITIES.includes(b.city)) return bad('Неизвестный город');
        if (!isInt(b.headcount, 1, 500)) return bad('Укажите, сколько нужно специалистов: от 1 до 500');
        if (b.experienceYears != null && !isInt(b.experienceYears, 0, 60)) return bad('Опыт должен быть от 0 до 60 лет');
        const budget = text(b.budget);
        if (budget.length > 100) return bad('Бюджет не должен превышать 100 символов');

        let deadline: Date | null = null;
        if (b.deadline) {
            deadline = new Date(b.deadline);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (Number.isNaN(deadline.getTime()) || deadline < today) return bad('Укажите срок не раньше сегодняшнего дня');
        }

        const description = text(b.description);
        if (description.length < 20 || description.length > 2000) return bad('Опишите задачу: от 20 до 2000 символов');
        if (detectSpam(description)) return bad('Текст похож на спам');

        const contactName = text(b.contactName);
        if (contactName.length < 2 || contactName.length > 100) return bad('Укажите имя или название компании');
        if (!isValidPhone(text(b.contactPhone))) return bad('Неверный формат номера. Используйте +992XXXXXXXXX');
        const contactEmail = text(b.contactEmail).toLowerCase();
        if (contactEmail && !isValidEmail(contactEmail)) return bad('Введите корректный email');

        const created = await prisma.sourcingRequest.create({
            data: {
                userId,
                category: b.category,
                city: b.city,
                headcount: b.headcount,
                experienceYears: b.experienceYears ?? null,
                budget: budget ? sanitizeString(budget) : null,
                deadline,
                description: sanitizeString(description),
                contactName: sanitizeString(contactName),
                contactPhone: normalizePhone(text(b.contactPhone)),
                contactEmail: contactEmail || null,
            },
        });

        // Fire-and-forget: the request is saved even if the email fails.
        getCompany()
            .then(company => company.email && sendSourcingRequestEmail(company.email, created))
            .catch(err => console.error('Sourcing email error:', err));

        return NextResponse.json({ request: created }, { status: 201 });
    } catch (error) {
        console.error('Create Sourcing Request Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// GET - the caller's own requests, newest first, with the professionals the team proposed
export async function GET(request: Request) {
    try {
        const payload = await requireAuth(request);
        if (!payload || !payload.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const requests = await prisma.sourcingRequest.findMany({
            where: { userId: payload.id as string },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        const ids = [...new Set(requests.flatMap(r => r.proposedIds))];
        const providers = ids.length
            ? await prisma.user.findMany({ where: { id: { in: ids }, role: 'PROVIDER' }, select: { id: true, fullName: true } })
            : [];
        const byId = new Map(providers.map(p => [p.id, p]));

        return NextResponse.json({
            requests: requests.map(({ adminNotes: _notes, ...r }) => ({
                ...r,
                proposed: r.proposedIds.map(id => byId.get(id)).filter(Boolean),
            })),
        });
    } catch (error) {
        console.error('List Sourcing Requests Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
