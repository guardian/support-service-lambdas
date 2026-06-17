import type { CommandResult, ExecutionOptions } from './runScript.js';
import { toCommandResult } from './runScript.js';
import {
	runChangedTargetsOrWarn,
	runTargetScriptStepWithOutcome,
	type TargetScriptStep,
} from './targetScriptRunner.js';

const checkFormattingStep: TargetScriptStep = {
	script: 'check-formatting',
	label: 'check-formatting',
	summaryLabel: 'check_formatting',
};

const lintStep: TargetScriptStep = {
	script: 'lint',
	label: 'lint',
	summaryLabel: 'lint',
};

const typeCheckStep: TargetScriptStep = {
	script: 'type-check',
	label: 'type-check',
	summaryLabel: 'type_check',
};

async function runVerifyStep(
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
				: `FAIL ${outcome.failCount} ${step.summaryLabel} check(s) failed`,
		],
		outcome.failCount === 0 ? 0 : 1,
	);
}

export async function runVerify(
	targets: string[],
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	const checks = [checkFormattingStep, lintStep, typeCheckStep];
	const lines: string[] = [];
	let failedChecks = 0;
	for (const check of checks) {
		const result = await runVerifyStep(targets, check, execOptions);
		if (result.output) {
			lines.push(result.output);
		}
		if (result.exitCode !== 0) {
			failedChecks += 1;
		}
	}
	lines.push(
		failedChecks === 0
			? 'OK   verify complete'
			: `FAIL ${failedChecks} verify stage(s) failed`,
	);
	return toCommandResult(lines, failedChecks === 0 ? 0 : 1);
}

export async function runVerifyChanged(
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	return await runChangedTargetsOrWarn(
		async (targets) => await runVerify(targets, execOptions),
	);
}

export async function runCheckFormatting(
	targets: string[],
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	return await runVerifyStep(targets, checkFormattingStep, execOptions);
}

export async function runLint(
	targets: string[],
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	return await runVerifyStep(targets, lintStep, execOptions);
}

export async function runTypeCheck(
	targets: string[],
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	return await runVerifyStep(targets, typeCheckStep, execOptions);
}

export async function runCheckFormattingChanged(
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	return await runChangedTargetsOrWarn(
		async (targets) => await runCheckFormatting(targets, execOptions),
	);
}

export async function runLintChanged(
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	return await runChangedTargetsOrWarn(
		async (targets) => await runLint(targets, execOptions),
	);
}

export async function runTypeCheckChanged(
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	return await runChangedTargetsOrWarn(
		async (targets) => await runTypeCheck(targets, execOptions),
	);
}
