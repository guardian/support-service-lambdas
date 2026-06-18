import type { CommandResult, ExecutionOptions } from '../../tools/runScript.js';
import { toCommandResult } from '../../tools/runScript.js';
import {
	runTargetScriptStepWithOutcome,
	type TargetScriptStep,
} from '../../tools/targetScriptRunner.js';

export const TEST_TIMEOUT_SECONDS = 600;

export function buildTestStep(extraArgs: string[]): TargetScriptStep {
	return {
		script: 'test',
		label:
			extraArgs.length === 0
				? 'test'
				: `test ${extraArgs.map((arg) => JSON.stringify(arg)).join(' ')}`,
		summaryLabel: 'test',
		extraArgs,
		timeoutSeconds: TEST_TIMEOUT_SECONDS,
		env: { CI: 'true' },
	};
}

export async function runTestWithArgs(
	targets: string[],
	extraArgs: string[],
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	const outcome = await runTargetScriptStepWithOutcome(
		targets,
		buildTestStep(extraArgs),
		execOptions,
	);
	const lines = [...outcome.lines];
	lines.push(
		outcome.failCount === 0
			? `OK   all tests passed (${outcome.passCount} target(s))`
			: `FAIL ${outcome.failCount} target(s) had test failures`,
	);
	return toCommandResult(lines, outcome.failCount === 0 ? 0 : 1);
}
