import type { ModuleDefinition } from '@buildcheck/managed/module';
import { recordFromEntries } from '../../src/util/dependencyMapper';

export const collectAllDeps = (
	pkg: ModuleDefinition,
	visited: Set<string> = new Set(),
): string[] =>
	pkg.moduleDependencies.flatMap((dep) => {
		if (visited.has(dep.name)) {
			return [];
		}
		visited.add(dep.name);
		return [dep.name, ...collectAllDeps(dep, visited)];
	});

export function buildTsConfigJson(pkg: ModuleDefinition) {
	const transitiveDeps = [...collectAllDeps(pkg), pkg.name];

	return {
		extends: '../../tsconfig.json',
		compilerOptions: {
			paths: {
				'@modules/*': ['../../modules/*'], // special case, everyone gets this for free
				// adding the module list here instead of at the top level means we can only use declared dependencies
				...recordFromEntries(
					transitiveDeps.map(
						(moduleName) =>
							[
								`@modules/${moduleName}/*`,
								[`../../modules/${moduleName}/src/*`],
							] as const,
					),
				),
			},
		},
		...pkg.tsConfigExtra,
	};
}
