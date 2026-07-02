import guardian from '@guardian/eslint-config';
import { defineConfig } from 'eslint/config';
import { importOrderConfig } from '../../eslint.shared.mjs';

export default defineConfig([
	guardian.configs.recommended,
	importOrderConfig,
	{
		extends: [guardian.configs.recommended],
		files: ['test/**/*.ts', '**/*.test.ts'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-require-imports': 'off',
			'@typescript-eslint/unbound-method': 'off',
		},
	},
]);
