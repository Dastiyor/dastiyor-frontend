import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    const start = Date.now();
    let dbOk = false;
    let dbLatencyMs = 0;

    try {
        await prisma.$queryRaw`SELECT 1`;
        dbOk = true;
        dbLatencyMs = Date.now() - start;
    } catch {
        dbLatencyMs = Date.now() - start;
    }

    const status = dbOk ? 200 : 503;

    return NextResponse.json(
        {
            status: dbOk ? 'ok' : 'degraded',
            db: { ok: dbOk, latencyMs: dbLatencyMs },
            uptime: Math.floor(process.uptime()),
            timestamp: new Date().toISOString(),
        },
        { status }
    );
}
