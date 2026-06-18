import { parseRequiredTargets } from '../../cli/commandArgs.js';
import { runChangedTargetsOrWarn } from '../../tools/targetScriptRunner.js';
import type { CommandDefinition } from '../types.js';
import { runTestWithArgs } from './testStep.js';

const safetyNote =
	'test executes repository code, forces CI=true, and uses fixed timeouts';

export default {
	name: 'test',
	usage: '<target...> | --changed',
	description: 'run test with CI=true and fixed timeout',
	category: 'Test',
	safetyNote,
	handler: async (args, context) => {
		const parsed = parseRequiredTargets(args, 'test');
		if ('exitCode' in parsed) {
			return parsed;
		}
		if (parsed.changed) {
			return await runChangedTargetsOrWarn((targets) =>
				runTestWithArgs(targets, [], context.execOptions),
			);
		}
		return await runTestWithArgs(parsed.targets, [], context.execOptions);
	},
} satisfies CommandDefinition;
