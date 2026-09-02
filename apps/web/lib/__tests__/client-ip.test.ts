import { getClientIP } from '../rate-limit';

const req = (headers: Record<string, string>) =>
  new Request('http://localhost/api/x', { headers });

describe('getClientIP', () => {
  it('prefers the Cloudflare client header over the proxy chain', () => {
    // Cloudflare fronts the app, so x-forwarded-for starts with an edge IP.
    // Keying on that put every visitor behind one edge in a shared bucket.
    expect(getClientIP(req({
      'cf-connecting-ip': '95.142.10.7',
      'x-forwarded-for': '172.70.100.67, 10.0.0.1',
    }))).toBe('95.142.10.7');
  });

  it('falls back through true-client-ip and x-real-ip', () => {
    expect(getClientIP(req({ 'true-client-ip': '95.142.10.8' }))).toBe('95.142.10.8');
    expect(getClientIP(req({ 'x-real-ip': '95.142.10.9' }))).toBe('95.142.10.9');
  });

  it('still uses x-forwarded-for when no proxy header is present', () => {
    expect(getClientIP(req({ 'x-forwarded-for': '95.142.10.10, 10.0.0.1' }))).toBe('95.142.10.10');
  });

  it('skips malformed values rather than bucketing on garbage', () => {
    expect(getClientIP(req({
      'cf-connecting-ip': 'not-an-ip',
      'x-real-ip': '95.142.10.11',
    }))).toBe('95.142.10.11');
  });

  it('returns "unknown" when nothing usable is present', () => {
    expect(getClientIP(req({}))).toBe('unknown');
  });
});
