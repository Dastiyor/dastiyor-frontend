import { prisma } from '@/lib/prisma';

export type AuditAction =
    | 'LOGIN'
    | 'LOGIN_FAILED'
    | 'LOGIN_OAUTH'
    | 'LOGIN_OAUTH_LINKED'
    | 'REGISTER'
    | 'REGISTER_OAUTH'
    | 'LOGOUT'
    | 'PASSWORD_RESET_REQUEST'
    | 'PASSWORD_RESET'
    | 'CREATE_TASK'
    | 'UPDATE_TASK'
    | 'CANCEL_TASK'
    | 'COMPLETE_TASK'
    | 'DELETE_TASK'
    | 'SUBMIT_RESPONSE'
    | 'ACCEPT_RESPONSE'
    | 'REJECT_RESPONSE'
    | 'SEND_MESSAGE'
    | 'LEAVE_REVIEW'
    | 'UPDATE_PROFILE'
    | 'CHANGE_PASSWORD'
    | 'UPLOAD_FILE';

interface AuditLogParams {
    action: AuditAction;
    userId?: string | null;
    entity?: string;
    entityId?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
}

/**
 * Log an action to the database audit trail.
 * Fire-and-forget — errors are caught and logged to console.
 */
export function logAction(params: AuditLogParams): void {
    const { action, userId, entity, entityId, details, ipAddress } = params;

    prisma.actionLog.create({
        data: {
            action,
            userId: userId || null,
            entity: entity || null,
            entityId: entityId || null,
            details: details ? JSON.stringify(details) : null,
            ipAddress: ipAddress || null,
        },
    }).catch((err) => {
        console.error('[AuditLog] Failed to write log:', err);
    });
}

/**
 * Extract client IP from request (works with Vercel/proxied setups).
 */
export function getRequestIP(request: Request): string {
    return (
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        'unknown'
    );
}
