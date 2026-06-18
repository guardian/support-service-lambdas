import { parseRequiredTargets } from '../../cli/commandArgs.js';
import type { CommandResult, ExecutionOptions } from '../../tools/runScript.js';
import {
	runChangedTargetsOrWarn,
	runSingleStep,
	type TargetScriptStep,
} from '../../tools/targetScriptRunner.js';
import type { CommandDefinition } from '../types.js';

export const checkFormattingStep: TargetScriptStep = {
	script: 'check-formatting',
	label: 'check-formatting',
	summaryLabel: 'check_formatting',
};

async function runCheckFormatting(
	targets: string[],
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	return await runSingleStep(targets, checkFormattingStep, execOptions);
}

export const checkFormattingCommand: CommandDefinition = {
	name: 'check_formatting',
	usage: '<target...> | --changed',
	description: 'run check-formatting',
	category: 'Verification',
	handler: async (args, context) => {
		const parsed = parseRequiredTargets(args, 'check_formatting');
		if ('exitCode' in parsed) {
			return parsed;
		}
		if (parsed.changed) {
			return await runChangedTargetsOrWarn((targets) =>
				runCheckFormatting(targets, context.execOptions),
			);
		}
		return await runCheckFormatting(parsed.targets, context.execOptions);
	},
};
