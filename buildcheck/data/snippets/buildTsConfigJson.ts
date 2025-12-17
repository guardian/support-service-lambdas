import type { ModuleDefinition } from '../build';

export function buildTsConfigJson(pkg: ModuleDefinition) {
	return {
		extends: '../../tsconfig.json',
		...pkg.tsConfigExtra,
	};
}
