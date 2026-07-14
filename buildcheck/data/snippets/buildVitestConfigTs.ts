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
		include: ['**/*Integration.test.ts', '**/*.it.test.ts'],
		testTimeout: 15000,
	},
});
`;
}
