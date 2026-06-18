import { parseRequiredTargets } from '../../cli/commandArgs.js';
import type { CommandResult, ExecutionOptions } from '../../tools/runScript.js';
import {
	runChangedTargetsOrWarn,
	runSingleStep,
	type TargetScriptStep,
} from '../../tools/targetScriptRunner.js';
import type { CommandDefinition } from '../types.js';

const fixFormattingStep: TargetScriptStep = {
	script: 'fix-formatting',
	label: 'fix-formatting',
	summaryLabel: 'fix_formatting',
};

async function runFixFormatting(
	targets: string[],
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	return await runSingleStep(targets, fixFormattingStep, execOptions);
}

export default {
	name: 'fix_formatting',
	usage: '<target...> | --changed',
	description: 'run fix-formatting',
	category: 'Fix',
	handler: async (args, context) => {
		const parsed = parseRequiredTargets(args, 'fix_formatting');
		if ('exitCode' in parsed) {
			return parsed;
		}
		if (parsed.changed) {
			return await runChangedTargetsOrWarn((targets) =>
				runFixFormatting(targets, context.execOptions),
			);
		}
		return await runFixFormatting(parsed.targets, context.execOptions);
	},
} satisfies CommandDefinition;
