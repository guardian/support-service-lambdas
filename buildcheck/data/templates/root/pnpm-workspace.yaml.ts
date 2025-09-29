import { RootDefinition } from '../../build';

export default (pkg: RootDefinition) => ({
	packages: ['handlers/*', 'modules/*', 'cdk', 'buildcheck'],
	catalog: pkg.catalog,
});
