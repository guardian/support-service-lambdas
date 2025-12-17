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
	return {
		name: `${pkg.name}`,
		scripts: {
			test: 'jest --group=-integration',
			'it-test': 'jest --group=integration',
			'type-check': 'tsc --noEmit',
			lint: "eslint --cache --cache-location /tmp/eslintcache/ 'src/**/*.ts' 'test/**/*.ts'",
			'check-formatting': 'prettier --check "**/*.ts"',
			'fix-formatting': 'prettier --write "**/*.ts"',
			...extraScripts,
			...pkg.extraScripts,
		},
		NOTICE1: notice(filename),
		NOTICE2: 'all dependencies are defined in buildcheck/data/build.ts',
		dependencies: pkg.dependencies,
		devDependencies: pkg.devDependencies,
	};
}
