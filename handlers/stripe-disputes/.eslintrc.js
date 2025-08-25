module.exports = {
	overrides: [
		{
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
	],
};