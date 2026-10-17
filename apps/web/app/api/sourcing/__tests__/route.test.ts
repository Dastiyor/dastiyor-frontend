/** @jest-environment node */
import { GET, POST } from '../route';
import { prismaMock } from '../../../../__tests__/mocks/prisma';
import { requireAuth } from '@/lib/require-auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendSourcingRequestEmail } from '@/lib/notifications/email';

jest.mock('@/lib/require-auth', () => ({ requireAuth: jest.fn() }));
jest.mock('@/lib/rate-limit', () => ({ ...jest.requireActual('@/lib/rate-limit'), checkRateLimit: jest.fn() }));
jest.mock('@/lib/notifications/email', () => ({ sendSourcingRequestEmail: jest.fn() }));
jest.mock('@/lib/company', () => ({ getCompany: jest.fn(async () => ({ email: 'team@dastiyor.com' })) }));
jest.mock('@/lib/categories', () => ({ getCategories: jest.fn(async () => ['Ремонт', 'Уборка']) }));

const valid = {
    category: 'Ремонт', city: 'Худжанд', headcount: 3, experienceYears: 2, budget: '5000 сомони в месяц',
    deadline: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
    description: 'Нужны три мастера для ремонта офиса на два месяца, опыт от двух лет.',
    contactName: 'ООО Пример', contactPhone: '+992935001234', contactEmail: 'hr@example.tj',
};
const post = (body: object) => POST(new Request('http://localhost/api/sourcing', { method: 'POST', body: JSON.stringify(body) }));

describe('/api/sourcing', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (requireAuth as jest.Mock).mockResolvedValue({ id: 'user-1' });
        (checkRateLimit as jest.Mock).mockResolvedValue({ allowed: true, remaining: 4, resetIn: 0 });
        (sendSourcingRequestEmail as jest.Mock).mockResolvedValue(true);
        prismaMock.sourcingRequest.create.mockImplementation((async ({ data }: { data: object }) => ({ id: 'sr1', status: 'NEW', ...data })) as never);
    });

    it('requires a login', async () => {
        (requireAuth as jest.Mock).mockResolvedValue(null);
        expect((await post(valid)).status).toBe(401);
        expect((await GET(new Request('http://localhost/api/sourcing'))).status).toBe(401);
    });

    it('creates and emails the team', async () => {
        const res = await post(valid);

        expect(res.status).toBe(201);
        const { data } = prismaMock.sourcingRequest.create.mock.calls[0][0] as { data: Record<string, unknown> };
        expect(data).toMatchObject({
            userId: 'user-1', category: 'Ремонт', city: 'Худжанд', headcount: 3, experienceYears: 2,
            contactPhone: '+992935001234', contactEmail: 'hr@example.tj',
        });
        expect(data.deadline).toBeInstanceOf(Date);
        expect(sendSourcingRequestEmail).toHaveBeenCalledWith('team@dastiyor.com', expect.objectContaining({ id: 'sr1' }));
    });

    it('email failure does not fail the request', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        (sendSourcingRequestEmail as jest.Mock).mockRejectedValue(new Error('brevo down'));
        expect((await post(valid)).status).toBe(201);
    });

    it.each([
        [{ city: 'Москва' }, 'Неизвестный город'],
        [{ category: 'Таъмир' }, 'Неизвестная категория'],
        [{ headcount: 0 }, 'Укажите, сколько нужно специалистов: от 1 до 500'],
        [{ headcount: 501 }, 'Укажите, сколько нужно специалистов: от 1 до 500'],
        [{ experienceYears: 70 }, 'Опыт должен быть от 0 до 60 лет'],
        [{ budget: 'x'.repeat(101) }, 'Бюджет не должен превышать 100 символов'],
        [{ deadline: '2020-01-01' }, 'Укажите срок не раньше сегодняшнего дня'],
        [{ deadline: 'soon' }, 'Укажите срок не раньше сегодняшнего дня'],
        [{ description: 'коротко' }, 'Опишите задачу: от 20 до 2000 символов'],
        [{ contactName: ' ' }, 'Укажите имя или название компании'],
        [{ contactPhone: '123' }, 'Неверный формат номера. Используйте +992XXXXXXXXX'],
        [{ contactEmail: 'nope' }, 'Введите корректный email'],
    ])('rejects %p', async (patch, error) => {
        const res = await post({ ...valid, ...patch });
        expect(res.status).toBe(400);
        expect((await res.json()).error).toBe(error);
        expect(prismaMock.sourcingRequest.create).not.toHaveBeenCalled();
    });

    it('rejects spam', async () => {
        const res = await post({ ...valid, description: 'You win a FREE prize — click here to claim it today' });
        expect(res.status).toBe(400);
        expect((await res.json()).error).toBe('Текст похож на спам');
    });

    it('rate limit returns 429', async () => {
        (checkRateLimit as jest.Mock).mockResolvedValue({ allowed: false, remaining: 0, resetIn: 3600_000 });
        expect((await post(valid)).status).toBe(429);
        expect(checkRateLimit).toHaveBeenCalledWith('sourcing:user-1', 'sourcing');
    });

    it('GET returns only own requests with proposed professionals', async () => {
        prismaMock.sourcingRequest.findMany.mockResolvedValue([{ id: 'sr1', proposedIds: ['p1', 'p2'] }] as never);
        prismaMock.user.findMany.mockResolvedValue([{ id: 'p1', fullName: 'Ali' }] as never);

        const data = await (await GET(new Request('http://localhost/api/sourcing'))).json();

        expect(prismaMock.sourcingRequest.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { userId: 'user-1' }, orderBy: { createdAt: 'desc' },
        }));
        expect(prismaMock.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: { in: ['p1', 'p2'] }, role: 'PROVIDER' },
        }));
        expect(data.requests[0].proposed).toEqual([{ id: 'p1', fullName: 'Ali' }]);
    });
});
