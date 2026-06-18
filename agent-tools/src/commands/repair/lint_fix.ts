import { parseRequiredTargets } from '../../cli/commandArgs.js';
import type { CommandResult, ExecutionOptions } from '../../tools/runScript.js';
import {
	runChangedTargetsOrWarn,
	runSingleStep,
	type TargetScriptStep,
} from '../../tools/targetScriptRunner.js';
import type { CommandDefinition } from '../types.js';

const lintFixStep: TargetScriptStep = {
	script: 'lint',
	label: 'lint --fix',
	summaryLabel: 'lint_fix',
	extraArgs: ['--fix'],
};

async function runLintFix(
	targets: string[],
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	return await runSingleStep(targets, lintFixStep, execOptions);
}

export const lintFixCommand: CommandDefinition = {
	name: 'lint_fix',
	usage: '<target...> | --changed',
	description: 'run lint --fix',
	category: 'Fix',
	handler: async (args, context) => {
		const parsed = parseRequiredTargets(args, 'lint_fix');
		if ('exitCode' in parsed) {
			return parsed;
		}
		if (parsed.changed) {
			return await runChangedTargetsOrWarn((targets) =>
				runLintFix(targets, context.execOptions),
			);
		}
		return await runLintFix(parsed.targets, context.execOptions);
	},
};
