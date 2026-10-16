import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { sanitizeString } from '@/lib/validation';
import { isSafeAvatarUrl } from '@/lib/avatar-url';

export const MAX_PROJECTS = 20;
export const MAX_PROJECT_IMAGES = 8;

export interface ProjectInput {
    title: string;
    description: string | null;
    images: string[];
}

/** Validate a portfolio project body. Returns the cleaned input or a Russian error. */
export function parseProject(body: unknown): { value: ProjectInput } | { error: string } {
    const { title, description, images = [] } = (body ?? {}) as Record<string, unknown>;

    const cleanTitle = typeof title === 'string' ? title.trim() : '';
    if (cleanTitle.length < 1 || cleanTitle.length > 100) {
        return { error: 'Название проекта: от 1 до 100 символов' };
    }
    if (description != null && (typeof description !== 'string' || description.length > 1000)) {
        return { error: 'Описание проекта не должно превышать 1000 символов' };
    }
    if (!Array.isArray(images)) return { error: 'Некорректная ссылка на фото' };
    if (images.length > MAX_PROJECT_IMAGES) return { error: 'Не больше 8 фотографий в проекте' };
    // Same rule as avatars: only storage we control, so viewers never fetch from a stranger's host.
    if (!images.every(img => typeof img === 'string' && isSafeAvatarUrl(img))) {
        return { error: 'Некорректная ссылка на фото' };
    }

    const cleanDescription = typeof description === 'string' && description.trim()
        ? sanitizeString(description.trim())
        : null;
    return { value: { title: sanitizeString(cleanTitle), description: cleanDescription, images: images as string[] } };
}

/** Auth + PROVIDER role check shared by the portfolio routes. */
export async function requireProvider(request: Request): Promise<{ userId: string } | { response: NextResponse }> {
    const payload = await requireAuth(request);
    if (!payload || !payload.id) {
        return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    }
    const user = await prisma.user.findUnique({ where: { id: payload.id as string }, select: { role: true } });
    if (user?.role !== 'PROVIDER') {
        return { response: NextResponse.json({ error: 'Портфолио доступно только исполнителям' }, { status: 403 }) };
    }
    return { userId: payload.id as string };
}
