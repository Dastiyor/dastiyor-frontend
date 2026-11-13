import { GET } from '../route';
import { drainTaskAlerts } from '@/lib/task-alerts';

jest.mock('@/lib/task-alerts', () => ({ drainTaskAlerts: jest.fn() }));

const CRON_SECRET = 'test-cron-secret';

const makeRequest = (authHeader?: string) =>
    new Request('http://localhost/api/cron/send-task-alerts', {
        headers: authHeader ? { authorization: authHeader } : {},
    });

describe('/api/cron/send-task-alerts', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const err = jest.spyOn(console, 'error').mockImplementation(() => {});

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.CRON_SECRET = CRON_SECRET;
    });

    afterAll(() => {
        log.mockRestore();
        err.mockRestore();
    });

    it('is disabled when CRON_SECRET is not set', async () => {
        delete process.env.CRON_SECRET;
        const res = await GET(makeRequest(`Bearer ${CRON_SECRET}`));
        expect(res.status).toBe(503);
        expect(drainTaskAlerts).not.toHaveBeenCalled();
    });

    it('rejects a missing or wrong secret', async () => {
        expect((await GET(makeRequest())).status).toBe(401);
        expect((await GET(makeRequest('Bearer wrong'))).status).toBe(401);
        expect(drainTaskAlerts).not.toHaveBeenCalled();
    });

    it('drains the queue and reports the counts', async () => {
        (drainTaskAlerts as jest.Mock).mockResolvedValue({ claimed: 3, sent: 2, skipped: 1, failed: 0, expired: 0, pruned: 5 });

        const res = await GET(makeRequest(`Bearer ${CRON_SECRET}`));
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data).toMatchObject({ claimed: 3, sent: 2, skipped: 1, pruned: 5 });
        expect(typeof data.at).toBe('string');
    });

    it('returns 500 when the drain fails, so the workflow run fails', async () => {
        (drainTaskAlerts as jest.Mock).mockRejectedValue(new Error('db down'));
        const res = await GET(makeRequest(`Bearer ${CRON_SECRET}`));
        expect(res.status).toBe(500);
    });
});
