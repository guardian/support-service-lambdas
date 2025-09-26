import { RootDefinition } from '../../build';
import { content } from '../../snippets/content';

export default (pkg: RootDefinition) =>
	content({
		packages: ['handlers/*', 'modules/*', 'cdk', 'buildcheck'],
		catalog: pkg.catalog,
	});
