import type { BuildDefinition } from '../../../../build';
import { notice } from '../../../../snippets/notices';

// not in buildcheck but we do want to build it
const cdkOnlyProjects = ['iam-policies', 'salesforce-event-bus'];

export default (build: BuildDefinition) => ({
	NOTICE: notice(__filename),
	subproject: [
		...build.handlers.map((def) => def.name),
		...cdkOnlyProjects,
	].sort(),
});
