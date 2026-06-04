import type { ModuleDefinition } from '@buildcheck/managed/module/index';
import { buildPackageJson } from '@buildcheck/snippets/buildPackageJson';

export default (pkg: ModuleDefinition) => {
	const moduleScripts = { build: 'tsc --noEmit' };
	return buildPackageJson(pkg, moduleScripts, __filename);
};
