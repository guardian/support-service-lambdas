import guardian from '@guardian/eslint-config';
import { importOrderConfig } from './eslint.shared.mjs';

export default [
	...guardian.configs.recommended,
	...guardian.configs.jest,
	...guardian.configs.react,
	...guardian.configs.storybook,
	importOrderConfig,
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
];
