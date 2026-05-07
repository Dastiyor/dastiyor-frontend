// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Polyfill TextEncoder/TextDecoder for Node.js test environment
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Polyfill for Request/Response (needed for Next.js API routes in tests)
if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    constructor(input, init = {}) {
      const url = typeof input === 'string' ? input : input?.url;
      this.method = init.method || 'GET';
      this.headers = new Headers(init.headers);
      this.body = init.body;
      // Use defineProperty so subclasses (e.g. NextRequest) with a read-only url getter don't throw
      try {
        Object.defineProperty(this, 'url', { value: url, writable: false, configurable: true });
      } catch (_) {
        // ignore if url already defined (e.g. by NextRequest)
      }
    }
    async json() {
      return Promise.resolve(JSON.parse(this.body || '{}'));
    }
    text() {
      return Promise.resolve(this.body || '');
    }
  }
}

if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init = {}) {
      this.body = body
      this.status = init.status || 200
      this.statusText = init.statusText || 'OK'
      this.headers = new Headers(init.headers)
    }
    static json(data, init = {}) {
      return new Response(JSON.stringify(data), {
        ...init,
        headers: { 'Content-Type': 'application/json', ...init.headers },
      })
    }
    json() {
      return Promise.resolve(JSON.parse(this.body || '{}'))
    }
    text() {
      return Promise.resolve(this.body || '')
    }
  }
}

// Mock scrollIntoView for DOM elements
Element.prototype.scrollIntoView = jest.fn()

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock jose library globally
jest.mock('jose', () => ({
  SignJWT: jest.fn().mockImplementation(() => ({
    setProtectedHeader: jest.fn().mockReturnThis(),
    setIssuedAt: jest.fn().mockReturnThis(),
    setExpirationTime: jest.fn().mockReturnThis(),
    sign: jest.fn().mockResolvedValue('mock.jwt.token'),
  })),
  jwtVerify: jest.fn().mockImplementation((token) => {
    if (!token || token === '') {
      return Promise.reject(new Error('Invalid token'));
    }
    if (token === 'mock.jwt.token' || token.split('.').length === 3) {
      return Promise.resolve({
        payload: {
          id: 'test-user-id',
          email: 'test@example.com',
          role: 'CUSTOMER'
        }
      });
    }
    return Promise.reject(new Error('Invalid token'));
  }),
}));

// Mock environment variables
process.env.JWT_SECRET = 'test-secret-key'
process.env.DATABASE_URL = 'file:./test.db'
process.env.NODE_ENV = 'test'

// globally mock prisma
jest.mock('@/lib/prisma', () => {
  const { mockDeep } = require('jest-mock-extended');
  return {
    __esModule: true,
    prisma: mockDeep(),
  };
});

// globally mock lib/audit to prevent missing catch undefined errors
jest.mock('@/lib/audit', () => ({
  logAction: jest.fn(),
  getRequestIP: jest.fn(() => '127.0.0.1'),
}));

// Mock i18n context so components can render without I18nProvider wrapper
jest.mock('@/lib/i18n/context', () => {
  const ru = require('./lib/i18n/locales/ru.json');

  function getNestedValue(obj, path) {
    const keys = path.split('.');
    let current = obj;
    for (const key of keys) {
      if (current == null || typeof current !== 'object') return path;
      current = current[key];
    }
    return typeof current === 'string' ? current : path;
  }

  return {
    I18nProvider: ({ children }) => children,
    useTranslation: () => ({
      locale: 'ru',
      setLocale: jest.fn(),
      t: (key, params) => {
        let value = getNestedValue(ru, key);
        if (params && typeof value === 'string') {
          Object.entries(params).forEach(([k, v]) => {
            value = value.replace(new RegExp(`{${k}}`, 'g'), String(v));
          });
        }
        return value;
      },
    }),
  };
});
