import type { BuildDefinition } from '../../../../build';
import { notice } from '../../../../snippets/notices';

// not in buildcheck but we do want to build it
const cdkOnlyProjects = [
	'iam-policies',
	'salesforce-event-bus',
	'cancellations-bus',
];

export default (build: BuildDefinition) => ({
	NOTICE: notice(__filename),
	include: [
		...build.handlers.map((def) => ({
			subproject: def.name,
			hasTsSource: true,
		})),
		...cdkOnlyProjects.map((name) => ({
			subproject: name,
			hasTsSource: false,
		})),
	].sort((a, b) => a.subproject.localeCompare(b.subproject)),
});
