import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: { tsconfigPaths: true },
	test: {
		globals: true,
		environment: 'node',
		include: ['**/*Integration.test.ts', '**/*.it.test.ts'],
		testTimeout: 15000,
	},
});
