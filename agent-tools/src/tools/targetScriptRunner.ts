import type { CommandResult, ExecutionOptions } from './runScript.js';
import {
	hasScript,
	printProgress,
	runScript,
	toCommandResult,
} from './runScript.js';
import { resolveChangedTargets } from './targetSelection.js';

export type TargetScriptStep = {
	script: string;
	label: string;
	summaryLabel: string;
	extraArgs?: string[];
	timeoutSeconds?: number;
	env?: Record<string, string>;
};

export type TargetScriptStepOutcome = {
	lines: string[];
	failCount: number;
	passCount: number;
};

export function resolveChangedTargetsOrWarn():
	| CommandResult
	| { targets: string[] } {
	const targets = resolveChangedTargets();
	if (targets.length === 0) {
		return toCommandResult([
			'WARN no changed handlers/*, modules/*, cdk, or buildcheck targets detected',
		]);
	}
	return { targets };
}

export async function runChangedTargetsOrWarn(
	run: (targets: string[]) => Promise<CommandResult>,
): Promise<CommandResult> {
	const changed = resolveChangedTargetsOrWarn();
	if ('exitCode' in changed) {
		return changed;
	}
	return await run(changed.targets);
}

export async function runTargetScriptStepWithOutcome(
	targets: string[],
	step: TargetScriptStep,
	execOptions: ExecutionOptions,
): Promise<TargetScriptStepOutcome> {
	const lines: string[] = [];
	let failCount = 0;
	let passCount = 0;

	for (const target of targets) {
		printProgress(`TARGET ${target}`);
		if (!hasScript(target, step.script)) {
			const warn = `WARN ${target} ${step.script}: skipped (not in package.json)`;
			printProgress(warn);
			lines.push(warn);
			continue;
		}
		printProgress(`RUN  ${target} ${step.label}`);
		const result = await runScript(target, step.script, {
			extraArgs: step.extraArgs,
			timeoutSeconds: step.timeoutSeconds,
			env: step.env,
			execOptions,
		});
		const durationSeconds = Math.round(result.durationMs / 1000);
		if (result.passed) {
			printProgress(`OK   ${target} ${step.label} (${durationSeconds}s)`);
			passCount++;
		} else {
			const fail = `FAIL ${target} ${step.label} (${durationSeconds}s)`;
			printProgress(fail);
			lines.push(fail);
			if (result.excerpt) {
				lines.push(result.excerpt);
			}
			failCount++;
		}
	}

	return { lines, failCount, passCount };
}

export async function runSingleStep(
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
				: `FAIL ${outcome.failCount} ${step.summaryLabel} failure(s)`,
		],
		outcome.failCount === 0 ? 0 : 1,
	);
}
