/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	roots: ['<rootDir>/test', '<rootDir>/src'],
	testMatch: ['**/*.test.ts'],
	moduleNameMapper: {
		'@modules/(.*)/(.*)$': '<rootDir>/../../modules/$1/src/$2',
		'@modules/(.*)$': '<rootDir>/../../modules/$1',
	},
	collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts'],
	coverageReporters: ['text', 'lcov', 'html'],
	coverageDirectory: 'coverage',
};
