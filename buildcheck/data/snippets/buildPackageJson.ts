import type { ModuleDefinition } from '../build';
import { notice } from './notices';

export function buildPackageJson(
	pkg: ModuleDefinition,
	extraScripts: Record<string, string>,
	filename: string,
) {
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
