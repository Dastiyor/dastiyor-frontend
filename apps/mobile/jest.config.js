module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/*.test.[jt]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '/.expo/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@dastiyor/types$': '<rootDir>/../../packages/types/index.ts',
  },
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'contexts/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    '!**/*.d.ts',
  ],
};
