module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	transform: {
		'^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
	},
	moduleNameMapper: {
		'@modules/(.*)/(.*)$': '<rootDir>/../../modules/$1/src/$2',
		'@modules/(.*)$': '<rootDir>/../../modules/$1',
	},
};
