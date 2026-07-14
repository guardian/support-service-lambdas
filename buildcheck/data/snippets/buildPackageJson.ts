import { recordFromEntries } from '../../src/util/dependencyMapper';
import type { ModuleDefinition } from '../build';
import { disallowedLibs } from '../dependencies';
import { notice } from './notices';

function assertNoDisallowedLibs(
	name: string,
	dependencies: Record<string, string> | undefined,
) {
	const dependencyErrors = Object.keys(dependencies ?? {}).flatMap((depName) =>
		disallowedLibs[depName]
			? [`do not use ${depName}: ${disallowedLibs[depName]}`]
			: [],
	);
	if (dependencyErrors.length !== 0) {
		throw new Error(
			`${name}: disallowed dependencies: ` + dependencyErrors.join('\n'),
		);
	}
}

export function buildPackageJson(
	pkg: ModuleDefinition,
	extraScripts: Record<string, string>,
	filename: string,
) {
	assertNoDisallowedLibs(pkg.name, pkg.dependencies);
	assertNoDisallowedLibs(pkg.name, pkg.devDependencies);

	const passWithNoTests = pkg.noTests ? ' --passWithNoTests' : '';
	const testScripts =
		pkg.testRunner === 'jest'
			? {
					test: `jest --group=-integration${passWithNoTests}`,
					'it-test':
						'NODE_OPTIONS="$NODE_OPTIONS --experimental-vm-modules" jest --group=integration',
				}
			: {
					test: `vitest run${passWithNoTests}`,
					'it-test': 'vitest run --config vitest.integration.config.ts',
				};

	const lintGlobs = pkg.noTests
		? "'src/**/*.ts'"
		: "'src/**/*.ts' 'test/**/*.ts'";

	return {
		name: `${pkg.name}`,
		scripts: {
			...testScripts,
			'type-check': 'tsc --noEmit',
			lint: `eslint --cache --cache-location /tmp/eslintcache/ ${lintGlobs}`,
			'check-formatting': 'prettier --check "**/*.ts"',
			'fix-formatting': 'prettier --write "**/*.ts"',
			...extraScripts,
			...pkg.extraScripts,
		},
		NOTICE1: notice(filename),
		NOTICE2: 'all dependencies are defined in buildcheck/data/build.ts',
		dependencies: {
			...pkg.dependencies,
			// adding the module dependencies to the package.json allows pnpm to correctly filter the modules when we do ---filter <project>... with the three dots
			...recordFromEntries(
				pkg.moduleDependencies.map((module) => [module.name, 'workspace:*']),
			),
		},
		devDependencies: pkg.devDependencies,
	};
}
