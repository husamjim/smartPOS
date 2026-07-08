process.env.NODE_ENV = 'test';
process.env.ACCESS_TOKEN_SECRET = 'test_access_secret_64_characters_long_for_security_checks_validation';
process.env.REFRESH_TOKEN_SECRET = 'test_refresh_secret_64_characters_long_for_security_checks_validation';

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts', '**/*.spec.ts'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};
