import { NextResponse } from 'next/server';
import type { User } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { signJWT, SESSION_MAX_AGE } from '@/lib/auth';
import { persistRequestLocale } from '@/lib/persist-locale';
import { logAction, getRequestIP } from '@/lib/audit';

/**
 * What every successful sign-in does, by password or by SMS code: clear the
 * failed-attempt lock, issue the token (body for mobile, cookie for web) and
 * record it. `via` goes into the audit log.
 */
export async function signedInResponse(request: Request, user: User, via: 'password' | 'sms') {
    await prisma.user.update({
        where: { id: user.id },
        data: { loginAttempts: 0, lockedUntil: null },
    });

    // tv = tokenVersion, for revocation support
    const token = await signJWT({
        id: user.id,
        email: user.email,
        role: user.role,
        tv: user.tokenVersion,
    });

    const response = NextResponse.json(
        {
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
            },
        },
        { status: 200 }
    );

    // Sign-in is where a language chosen while signed out reaches the account.
    await persistRequestLocale(request, user.id, user.locale)
        .catch(err => console.error('Locale persist error:', err));

    logAction({
        action: 'LOGIN',
        userId: user.id,
        entity: 'User',
        entityId: user.id,
        details: { via },
        ipAddress: getRequestIP(request),
    });

    response.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: SESSION_MAX_AGE,
        path: '/',
    });

    return response;
}
