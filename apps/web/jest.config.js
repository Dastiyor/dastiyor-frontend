const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // @upstash packages use ESM and are never exercised in tests (no env vars → in-memory fallback)
    '^@upstash/redis$': '<rootDir>/__mocks__/@upstash/redis.js',
    '^@upstash/ratelimit$': '<rootDir>/__mocks__/@upstash/ratelimit.js',
  },
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  testMatch: [
    '**/*.test.[jt]s?(x)',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/tests/',
  ],
}

// ESM packages that must be transformed. Includes pnpm-flattened paths.
const ESM_MODULES = ['jose', '@upstash/redis', '@upstash/ratelimit'];
const esmPattern = ESM_MODULES.join('|');

async function resolvedConfig() {
  const config = await createJestConfig(customJestConfig)();
  // Replace Next.js pnpm default pattern to also allow ESM packages through.
  // pnpm flattens scoped packages as @scope+pkg (@ delimiter, + for slash),
  // so @upstash/redis becomes @upstash+redis — the + must be regex-escaped.
  const pnpmNames = ESM_MODULES.map((m) => m.replace('/', '\\+')).join('|');
  config.transformIgnorePatterns = [
    `/node_modules/(?!\\.pnpm)(?!(geist|${esmPattern})/)`,
    `/node_modules/\\.pnpm/(?!(geist|${pnpmNames})@)`,
    '^.+\\.module\\.(css|sass|scss)$',
  ];
  return config;
}

module.exports = resolvedConfig;
