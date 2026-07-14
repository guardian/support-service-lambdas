import type { ModuleDefinition } from '../build';

export function buildVitestConfigTs(
	_pkg: ModuleDefinition,
): string | undefined {
	if (_pkg.testRunner === 'jest') {
		return undefined;
	}
	return `import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: { tsconfigPaths: true },
	test: {
		globals: true,
		environment: 'node',
		include: ['test/**/*.{test,spec}.?(c|m)[jt]s?(x)'],
		exclude: [
			'**/node_modules/**',
			'**/*Integration.test.ts',
			'**/*.it.test.ts',
		],
	},
});
`;
}

export function buildVitestIntegrationConfigTs(
	_pkg: ModuleDefinition,
): string | undefined {
	if (_pkg.testRunner === 'jest') {
		return undefined;
	}
	return `import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: { tsconfigPaths: true },
	test: {
		globals: true,
		environment: 'node',
		include: ['test/**/*Integration.test.ts', 'test/**/*.it.test.ts'],
		testTimeout: 15000,
	},
});
`;
}
