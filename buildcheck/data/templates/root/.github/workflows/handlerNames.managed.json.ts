import type { BuildDefinition } from '../../../../build';
import { notice } from '../../../../snippets/notices';

export default (build: BuildDefinition) => ({
	NOTICE: notice(__filename),
	subproject: build.handlers.map((def) => def.name).sort(),
});
