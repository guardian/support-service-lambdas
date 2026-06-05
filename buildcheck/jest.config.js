/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	runner: 'groups',
	moduleNameMapper: {
		'@buildcheck/snippets/(.*)$': '<rootDir>/data/snippets/$1',
	},
};
