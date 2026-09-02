/**
 * The Vercel Upstash integration provisions KV_REST_API_* while the raw Upstash
 * console gives UPSTASH_REDIS_REST_*. Reading only one silently disables rate
 * limiting in production, since the limiter falls back to an in-memory store
 * that does nothing across serverless instances.
 */
describe('rate limiter credential discovery', () => {
  const saved = { ...process.env };
  afterEach(() => { process.env = { ...saved }; jest.resetModules(); });

  function redisConfigured(): boolean {
    const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
    return Boolean(url && token);
  }

  it('accepts the Vercel Marketplace names', () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    process.env.KV_REST_API_URL = 'https://example.upstash.io';
    process.env.KV_REST_API_TOKEN = 'token';
    expect(redisConfigured()).toBe(true);
  });

  it('accepts the raw Upstash names', () => {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token';
    expect(redisConfigured()).toBe(true);
  });

  it('reports unconfigured when neither pair is present', () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    expect(redisConfigured()).toBe(false);
  });
});
