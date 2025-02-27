/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	runner: 'groups',
	moduleNameMapper: {
		'^@modules/(.*)$': '<rootDir>/path/to/modules/$1',
	},
};
