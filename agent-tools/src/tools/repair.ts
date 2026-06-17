import type { CommandResult, ExecutionOptions } from './runScript.js';
import { toCommandResult } from './runScript.js';
import {
	runChangedTargetsOrWarn,
	runTargetScriptStepWithOutcome,
	type TargetScriptStep,
} from './targetScriptRunner.js';

const fixFormattingStep: TargetScriptStep = {
	script: 'fix-formatting',
	label: 'fix-formatting',
	summaryLabel: 'fix_formatting',
};

const lintFixStep: TargetScriptStep = {
	script: 'lint',
	label: 'lint --fix',
	summaryLabel: 'lint_fix',
	extraArgs: ['--fix'],
};

async function runStep(
	targets: string[],
	step: TargetScriptStep,
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	const outcome = await runTargetScriptStepWithOutcome(
		targets,
		step,
		execOptions,
	);
	return toCommandResult(
		[
			...outcome.lines,
			outcome.failCount === 0
				? `OK   ${step.summaryLabel} complete`
				: `FAIL ${outcome.failCount} ${step.summaryLabel} step(s) failed`,
		],
		outcome.failCount === 0 ? 0 : 1,
	);
}

export async function runFixFormatting(
	targets: string[],
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	return await runStep(targets, fixFormattingStep, execOptions);
}

export async function runLintFix(
	targets: string[],
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	return await runStep(targets, lintFixStep, execOptions);
}

export async function runFixFormattingChanged(
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	return await runChangedTargetsOrWarn(
		async (targets) => await runFixFormatting(targets, execOptions),
	);
}

export async function runLintFixChanged(
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	return await runChangedTargetsOrWarn(
		async (targets) => await runLintFix(targets, execOptions),
	);
}
