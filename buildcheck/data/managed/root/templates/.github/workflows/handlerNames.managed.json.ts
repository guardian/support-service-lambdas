import type { BuildDefinition } from '../../../../../build';
import { notice, relativePath } from '../../../../../snippets/notices';

// not in buildcheck but we do want to build it
const cdkOnlyProject = 'salesforce-event-bus';

export default (build: BuildDefinition) => ({
	NOTICE: notice(relativePath(__filename)),
	subproject: [...build.handlers.map((def) => def.name), cdkOnlyProject].sort(),
});
