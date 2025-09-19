module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/*.test.ts',
    '**/*.spec.ts',
    '**/*.integration.test.ts',
    '**/*.e2e.test.ts'
  ],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
    }],
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.integration.test.ts',
    '!src/**/*.e2e.test.ts',
    '!src/index.ts',
    '!src/docs/**/*',
    '!src/__tests__/fixtures/**/*',
    '!src/database/seed.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@shared/(.*)$': '<rootDir>/../shared/src/$1',
  },
  testTimeout: 30000,
  maxWorkers: '50%',
  
  // Test environments
  projects: [
    {
      displayName: 'unit',
      testMatch: [
        '<rootDir>/src/**/*.test.ts',
        '<rootDir>/src/**/*.spec.ts'
      ],
      testPathIgnorePatterns: [
        '<rootDir>/src/**/*.integration.test.ts',
        '<rootDir>/src/**/*.e2e.test.ts'
      ],
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/src/**/*.integration.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/src/__tests__/integration-setup.ts'],
    },
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/src/**/*.e2e.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/src/__tests__/e2e-setup.ts'],
      testTimeout: 60000,
    }
  ],

  // Performance testing
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './coverage/html-report',
      filename: 'report.html',
      openReport: false
    }],
    ['jest-junit', {
      outputDirectory: './coverage',
      outputName: 'junit.xml',
    }]
  ],

  // Global setup and teardown
  globalSetup: '<rootDir>/src/__tests__/global-setup.ts',
  globalTeardown: '<rootDir>/src/__tests__/global-teardown.ts',

  // Module resolution
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Clear mocks
  clearMocks: true,
  restoreMocks: true,
  
  // Verbose output for debugging
  verbose: true,
  
  // Watch options
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
};
