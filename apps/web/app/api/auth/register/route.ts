import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signJWT } from '@/lib/auth';
import { checkRateLimit, getClientIP, rateLimitExceededResponse } from '@/lib/rate-limit';
import { validatePassword, isValidPhone } from '@/lib/validation';
import { sendWelcomeEmail } from '@/lib/notifications/email';
import { logAction, getRequestIP } from '@/lib/audit';

export async function POST(request: Request) {
    try {
        // Rate limiting
        const clientIP = getClientIP(request);
        const rateLimit = checkRateLimit(clientIP, 'auth');

        if (!rateLimit.allowed) {
            return rateLimitExceededResponse(rateLimit.resetIn);
        }

        const body = await request.json();
        const { email, password, fullName, phone, role } = body;

        if (!email || !password || !fullName) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        if (phone && !isValidPhone(String(phone))) {
            return NextResponse.json(
                { error: 'Неверный формат номера телефона. Используйте формат +992XXXXXXXXX' },
                { status: 400 }
            );
        }

        const passwordValidation = validatePassword(String(password));
        if (!passwordValidation.valid) {
            return NextResponse.json(
                { error: passwordValidation.error },
                { status: 400 }
            );
        }

        // Check existing user
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: 'User already exists' },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create User
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                fullName,
                phone,
                role: role === 'provider' ? 'PROVIDER' : 'CUSTOMER',
            },
        });

        // Generate Token
        const token = await signJWT({
            id: user.id,
            email: user.email,
            role: user.role
        });

        const response = NextResponse.json(
            {
                message: 'User created successfully',
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    fullName: user.fullName,
                    role: user.role
                }
            },
            { status: 201 }
        );

        // Set cookie
        response.cookies.set('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 86400, // 1 day
            path: '/',
        });

        // Send welcome email (non-blocking)
        sendWelcomeEmail(user.email, user.fullName, user.role)
            .catch(err => console.error('Welcome email error:', err));

        logAction({
            action: 'REGISTER',
            userId: user.id,
            entity: 'User',
            entityId: user.id,
            details: { role: user.role },
            ipAddress: clientIP,
        });

        return response;

    } catch (error) {
        console.error('Registration Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
