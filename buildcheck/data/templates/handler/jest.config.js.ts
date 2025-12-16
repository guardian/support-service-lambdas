import { ModuleDefinition } from '../../build';

export default (
	pkg: ModuleDefinition,
) => `/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	runner: 'groups',${
		pkg.jestClearMocks
			? `
	clearMocks: true,`
			: ''
	}
	moduleNameMapper: {
		'@modules/([^/]*)/(.*)$': '<rootDir>/../../modules/$1/src/$2',
		'@modules/(.*)$': '<rootDir>/../../modules/$1',
	},${pkg.testTimeoutSeconds ? `\n	testTimeout: 1000 * ${pkg.testTimeoutSeconds},` : ''}
};
`;
