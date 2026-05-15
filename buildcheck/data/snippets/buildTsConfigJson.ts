import { recordFromEntries } from '../../src/util/dependencyMapper';
import type { ModuleDefinition } from '../build';

export const collectAllDeps = (
	pkg: ModuleDefinition,
	visited: Set<string> = new Set(),
): string[] =>
	pkg.moduleDeps.flatMap((dep) => {
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
				'@modules/*': ['../../modules/*'],
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
