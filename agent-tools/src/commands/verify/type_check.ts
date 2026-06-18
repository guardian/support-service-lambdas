import { parseRequiredTargets } from '../../cli/commandArgs.js';
import type { CommandResult, ExecutionOptions } from '../../tools/runScript.js';
import {
	runChangedTargetsOrWarn,
	runSingleStep,
	type TargetScriptStep,
} from '../../tools/targetScriptRunner.js';
import type { CommandDefinition } from '../types.js';

export const typeCheckStep: TargetScriptStep = {
	script: 'type-check',
	label: 'type-check',
	summaryLabel: 'type_check',
};

async function runTypeCheck(
	targets: string[],
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	return await runSingleStep(targets, typeCheckStep, execOptions);
}

export default {
	name: 'type_check',
	usage: '<target...> | --changed',
	description: 'run type-check',
	category: 'Verification',
	handler: async (args, context) => {
		const parsed = parseRequiredTargets(args, 'type_check');
		if ('exitCode' in parsed) {
			return parsed;
		}
		if (parsed.changed) {
			return await runChangedTargetsOrWarn((targets) =>
				runTypeCheck(targets, context.execOptions),
			);
		}
		return await runTypeCheck(parsed.targets, context.execOptions);
	},
} satisfies CommandDefinition;
