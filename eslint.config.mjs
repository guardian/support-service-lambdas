import guardian from '@guardian/eslint-config';

export default [
	...guardian.configs.recommended,
	...guardian.configs.jest,
	...guardian.configs.react,
	...guardian.configs.storybook,
	{
		rules: {
			'@typescript-eslint/consistent-type-assertions': [
				'error',
				{
					assertionStyle: 'never',
				},
			],
		},
	},
	{
		files: ['**/test/**/*.{ts,tsx,js,jsx}'],
		rules: {
			'@typescript-eslint/consistent-type-assertions': 'off',
		},
	},
	{
		rules: {
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					ignoreRestSiblings: true,
				},
			],
		},
	},
	{
		rules: {
			'@typescript-eslint/switch-exhaustiveness-check': 'error',
		},
	},
	{
		// agent-tools command files use export default so each command file
		// is a self-contained CommandDefinition; the registry uses default imports
		files: ['agent-tools/src/commands/**/*.ts'],
		rules: {
			'import/no-default-export': 'off',
		},
	},
];
