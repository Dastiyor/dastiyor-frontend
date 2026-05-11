import { prisma } from '@/lib/prisma';
import { signJWT } from '@/lib/auth';
import { sendWelcomeEmail } from '@/lib/notifications/email';
import { logAction } from '@/lib/audit';

export async function upsertOAuthUser({
    provider,
    providerId,
    email,
    name,
    role = 'customer',
    ipAddress,
}: {
    provider: 'google' | 'apple';
    providerId: string;
    email: string;
    name: string;
    role?: string;
    ipAddress?: string;
}) {
    // Find by provider ID first
    const existing = provider === 'google'
        ? await prisma.user.findUnique({ where: { googleId: providerId } })
        : await prisma.user.findUnique({ where: { appleId: providerId } });

    if (existing) {
        const token = await signJWT({ id: existing.id, email: existing.email, role: existing.role });
        logAction({
            action: 'LOGIN_OAUTH',
            userId: existing.id,
            entity: 'User',
            entityId: existing.id,
            details: { provider },
            ipAddress,
        });
        return { user: existing, token, isNew: false };
    }

    // Find by email — link OAuth to existing account
    const byEmail = await prisma.user.findUnique({ where: { email } });

    if (byEmail) {
        const updated = await prisma.user.update({
            where: { id: byEmail.id },
            data: provider === 'google' ? { googleId: providerId } : { appleId: providerId },
        });
        const token = await signJWT({ id: updated.id, email: updated.email, role: updated.role });
        logAction({
            action: 'LOGIN_OAUTH_LINKED',
            userId: updated.id,
            entity: 'User',
            entityId: updated.id,
            details: { provider },
            ipAddress,
        });
        return { user: updated, token, isNew: false };
    }

    // Create new user
    const newUser = await prisma.user.create({
        data: {
            email,
            fullName: name || email.split('@')[0],
            role: role === 'provider' ? 'PROVIDER' : 'CUSTOMER',
            ...(provider === 'google' ? { googleId: providerId } : { appleId: providerId }),
        },
    });

    const token = await signJWT({ id: newUser.id, email: newUser.email, role: newUser.role });

    sendWelcomeEmail(newUser.email, newUser.fullName, newUser.role)
        .catch(err => console.error('Welcome email error:', err));

    logAction({
        action: 'REGISTER_OAUTH',
        userId: newUser.id,
        entity: 'User',
        entityId: newUser.id,
        details: { provider, role: newUser.role },
        ipAddress,
    });

    return { user: newUser, token, isNew: true };
}

export function oauthCookieOptions() {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        maxAge: 86400,
        path: '/',
    };
}
