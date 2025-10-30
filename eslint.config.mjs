import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';

export default defineConfig([
	{
		files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
		plugins: { js },
		extends: ['js/recommended'],
		languageOptions: {
			globals: globals.node,
		},
	},
	{
		files: ['**/*.ts'],
		rules: {
			'@typescript-eslint/no-unsafe-argument': 'error',
			'require-await': 'off',
			'@typescript-eslint/require-await': 'error',
		},
		extends: [tseslint.configs.recommendedTypeChecked],
	},
	{
		languageOptions: {
			parserOptions: {
				projectService: true,
			},
		},
	},
]);
