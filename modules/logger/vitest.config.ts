import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: { tsconfigPaths: true },
	test: {
		globals: true,
		environment: 'node',
		exclude: [
			'**/node_modules/**',
			'**/*Integration.test.ts',
			'**/*.it.test.ts',
		],
	},
});
