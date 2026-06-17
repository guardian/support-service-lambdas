import { resolve } from 'path';
import {
	type CommandResult,
	type ExecutionOptions,
	ROOT,
	toCommandResult,
} from './runScript.js';
import {
	runChangedTargetsOrWarn,
	runTargetScriptStepWithOutcome,
	type TargetScriptStep,
} from './targetScriptRunner.js';

const TEST_TIMEOUT_SECONDS = 600;

function safeRelativePath(filePath: string): string | null {
	const normalized = filePath.replace(/^\/+/, '');
	if (normalized.includes('..')) {
		return null;
	}
	const abs = resolve(ROOT, normalized);
	if (abs !== ROOT && !abs.startsWith(`${ROOT}/`)) {
		return null;
	}
	return normalized;
}

function buildTestStep(extraArgs: string[]): TargetScriptStep {
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

export async function runTest(
	targets: string[],
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	return await runTestWithArgs(targets, [], execOptions);
}

export async function runTestChanged(
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	return await runChangedTargetsOrWarn(
		async (targets) => await runTestWithArgs(targets, [], execOptions),
	);
}

export async function runTestOne(
	target: string,
	pattern: string,
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	return await runTestWithArgs(
		[target],
		['--testPathPattern', pattern],
		execOptions,
	);
}

export async function runTestFile(
	target: string,
	filePath: string,
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	const safePath = safeRelativePath(filePath);
	if (!safePath) {
		return toCommandResult([`FAIL invalid filePath: ${filePath}`], 1);
	}
	if (!safePath.startsWith(`${target}/`)) {
		return toCommandResult(
			[`FAIL filePath must be inside target ${target}: ${filePath}`],
			1,
		);
	}
	return await runTestWithArgs([target], [safePath], execOptions);
}

async function runTestWithArgs(
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
