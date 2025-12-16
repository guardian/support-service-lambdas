import type { ModuleDefinition } from '../../build';

export default (pkg: ModuleDefinition) => {
	return {
		extends: '../../tsconfig.json',
		...pkg.tsConfigExtra,
	};
};
