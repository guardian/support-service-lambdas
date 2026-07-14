// MANAGED FILE: to push changes see buildcheck/README.md - template: buildcheck/data/templates/handler/vitest.config.ts.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: { tsconfigPaths: true },
	test: {
		globals: true,
		environment: 'node',
		include: ['test/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
		exclude: [
			'**/*Integration.test.ts',
			'**/*.it.test.ts',
		],
	},
});
