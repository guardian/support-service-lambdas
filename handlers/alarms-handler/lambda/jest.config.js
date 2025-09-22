// MANAGED FILE: to push changes see buildcheck/README.md - template: buildcheck/data/handlerTemplate/lambda/jest.config.js.ts
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	runner: 'groups',
	moduleNameMapper: {
		'@modules/(.*)/(.*)$': '<rootDir>/../../../modules/$1/src/$2',
		'@modules/(.*)$': '<rootDir>/../../../modules/$1',
	},
};
