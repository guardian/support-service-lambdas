import type { BuildDefinition } from '../../../../build';
import { notice } from '../../../../snippets/notices';

// not in buildcheck but we do want to build it
const cdkOnlyProject = 'salesforce-event-bus';

export default (build: BuildDefinition) => ({
	NOTICE: notice(__filename),
	subproject: [...build.handlers.map((def) => def.name), cdkOnlyProject],
});
