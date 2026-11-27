/**
 * @jest-environment node
 */
import { consumeOtp, issueOtp } from '../otp';
import { logAction } from '@/lib/audit';

type Row = { id: string; phone: string; code: string; type: string; used: boolean; expiresAt: Date; createdAt: Date };
let rows: Row[] = [];
let sequence = 0;

type Where = { id?: string | { in: string[] }; phone?: string; code?: string; type?: string; used?: boolean; expiresAt?: { gt?: Date; lte?: Date } };
const matches = (row: Row, where: Where) =>
    (where.id === undefined || (typeof where.id === 'string' ? row.id === where.id : where.id.in.includes(row.id)))
    && (['phone', 'code', 'type', 'used'] as const).every((key) => where[key] === undefined || row[key] === where[key])
    && (!where.expiresAt?.gt || row.expiresAt > where.expiresAt.gt)
    && (!where.expiresAt?.lte || row.expiresAt <= where.expiresAt.lte);

jest.mock('@/lib/prisma', () => ({
    prisma: {
        verificationCode: {
            create: async ({ data }: { data: Omit<Row, 'id' | 'used' | 'createdAt'> }) => {
                rows.push({ ...data, id: `c${++sequence}`, used: false, createdAt: new Date(Date.now() + sequence) });
            },
            findFirst: async ({ where }: { where: Where }) => rows.find((row) => matches(row, where)) ?? null,
            findMany: async ({ where, skip = 0 }: { where: Where; skip?: number }) =>
                rows.filter((row) => matches(row, where)).sort((a, b) => +b.createdAt - +a.createdAt).slice(skip),
            deleteMany: async ({ where }: { where: Where }) => {
                const before = rows.length;
                rows = rows.filter((row) => !matches(row, where));
                return { count: before - rows.length };
            },
        },
    },
}));
jest.mock('@/lib/notifications/sms', () => ({ sendVerificationCode: jest.fn(async () => true) }));
jest.mock('@/lib/audit', () => ({ logAction: jest.fn() }));

const PHONE = '+992900001234';
const reasons = () => (logAction as jest.Mock).mock.calls.map(([entry]) => entry.details.reason);

beforeEach(() => {
    rows = [];
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
});

it('still accepts the first code after another was asked for', async () => {
    await issueOtp(PHONE, 'LOGIN');
    const first = rows[0].code;
    await issueOtp(PHONE, 'LOGIN');
    expect(await consumeOtp(PHONE, first, 'LOGIN')).toBe(true);
});

it('spends every code for that number and purpose once one is used', async () => {
    await issueOtp(PHONE, 'LOGIN');
    await issueOtp(PHONE, 'LOGIN');
    await issueOtp(PHONE, 'REGISTRATION');
    const [first, second] = rows.map((row) => row.code);
    expect(await consumeOtp(PHONE, second, 'LOGIN')).toBe(true);
    expect(await consumeOtp(PHONE, first, 'LOGIN')).toBe(false);
    expect(rows.map((row) => row.type)).toEqual(['REGISTRATION']);
});

it('keeps only the three newest codes', async () => {
    for (let i = 0; i < 5; i++) await issueOtp(PHONE, 'LOGIN');
    expect(rows.map((row) => row.id)).toHaveLength(3);
});

it('records why a code was refused, without the code or the full number', async () => {
    expect(await consumeOtp(PHONE, '111111', 'LOGIN')).toBe(false);
    await issueOtp(PHONE, 'LOGIN');
    const sent = rows[0].code;
    expect(await consumeOtp(PHONE, sent === '000000' ? '000001' : '000000', 'LOGIN')).toBe(false);
    rows[0].expiresAt = new Date(Date.now() - 1000);
    expect(await consumeOtp(PHONE, sent, 'LOGIN')).toBe(false);

    expect(reasons()).toEqual(['no_code', 'wrong_code', 'expired']);
    const written = JSON.stringify([(logAction as jest.Mock).mock.calls, (console.warn as jest.Mock).mock.calls]);
    expect(written).toContain('***1234');
    expect(written).not.toContain(PHONE);
    expect(written).not.toContain(sent);
});
