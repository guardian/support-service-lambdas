import { parseRequiredTargets } from '../../cli/commandArgs.js';
import type { CommandResult, ExecutionOptions } from '../../tools/runScript.js';
import {
	runChangedTargetsOrWarn,
	runSingleStep,
	type TargetScriptStep,
} from '../../tools/targetScriptRunner.js';
import type { CommandDefinition } from '../types.js';

export const lintStep: TargetScriptStep = {
	script: 'lint',
	label: 'lint',
	summaryLabel: 'lint',
};

async function runLint(
	targets: string[],
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	return await runSingleStep(targets, lintStep, execOptions);
}

export const lintCommand: CommandDefinition = {
	name: 'lint',
	usage: '<target...> | --changed',
	description: 'run lint',
	category: 'Verification',
	handler: async (args, context) => {
		const parsed = parseRequiredTargets(args, 'lint');
		if ('exitCode' in parsed) {
			return parsed;
		}
		if (parsed.changed) {
			return await runChangedTargetsOrWarn((targets) =>
				runLint(targets, context.execOptions),
			);
		}
		return await runLint(parsed.targets, context.execOptions);
	},
};
