import { parseRequiredTargets } from '../../cli/commandArgs.js';
import type { CommandResult, ExecutionOptions } from '../../tools/runScript.js';
import { toCommandResult } from '../../tools/runScript.js';
import {
	runChangedTargetsOrWarn,
	runSingleStep,
} from '../../tools/targetScriptRunner.js';
import type { CommandDefinition } from '../types.js';
import { checkFormattingStep } from './check_formatting.js';
import { lintStep } from './lint.js';
import { typeCheckStep } from './type_check.js';

async function runVerify(
	targets: string[],
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	const steps = [checkFormattingStep, lintStep, typeCheckStep];
	const lines: string[] = [];
	let failedSteps = 0;
	for (const step of steps) {
		const result = await runSingleStep(targets, step, execOptions);
		if (result.output) {
			lines.push(result.output);
		}
		if (result.exitCode !== 0) {
			failedSteps += 1;
		}
	}
	lines.push(
		failedSteps === 0
			? 'OK   verify complete'
			: `FAIL ${failedSteps} verify stage(s) failed`,
	);
	return toCommandResult(lines, failedSteps === 0 ? 0 : 1);
}

export const verifyCommand: CommandDefinition = {
	name: 'verify',
	usage: '<target...> | --changed',
	description: 'run check-formatting + lint + type-check',
	category: 'Verification',
	handler: async (args, context) => {
		const parsed = parseRequiredTargets(args, 'verify');
		if ('exitCode' in parsed) {
			return parsed;
		}
		if (parsed.changed) {
			return await runChangedTargetsOrWarn((targets) =>
				runVerify(targets, context.execOptions),
			);
		}
		return await runVerify(parsed.targets, context.execOptions);
	},
};
