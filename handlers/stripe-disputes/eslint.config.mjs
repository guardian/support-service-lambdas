import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';

export default defineConfig([
	tseslint.configs.recommended,
	{
		extends: [tseslint.configs.recommended],
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
