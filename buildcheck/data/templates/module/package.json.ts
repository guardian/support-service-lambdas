import type { ModuleDefinition } from '../../build';
import { buildPackageJson } from '../../snippets/buildPackageJson';

export default (pkg: ModuleDefinition) => {
	const moduleScripts = { build: 'tsc --noEmit' };
	return buildPackageJson(pkg, moduleScripts, __filename);
};
