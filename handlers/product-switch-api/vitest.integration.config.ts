// MANAGED FILE: to push changes see buildcheck/README.md - template: buildcheck/data/templates/handler/vitest.integration.config.ts.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: { tsconfigPaths: true },
	test: {
		globals: true,
		environment: 'node',
		include: ['test/**/*Integration.test.ts', 'test/**/*.it.test.ts'],
		testTimeout: 15000,
	},
});
