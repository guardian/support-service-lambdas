import type { ModuleDefinition } from '../../build';
import { buildPackageJson } from '../../snippets/buildPackageJson';

export default (pkg: ModuleDefinition) => {
	const moduleScripts = {
		build: 'tsc --noEmit',
		buildcheck: `pnpm --filter buildcheck snapshot:assert modules/${pkg.name}`,
	};
	return buildPackageJson(pkg, moduleScripts, __filename);
};
