import { resolve } from 'path';
import {
	type CommandResult,
	type ExecutionOptions,
	hasScript,
	printProgress,
	ROOT,
	runScript,
	toCommandResult,
} from './runScript.js';
import { resolveChangedTargets } from './targetSelection.js';

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

function runTestForTarget(
	target: string,
	extraArgs: string[],
	execOptions: ExecutionOptions,
) {
	return runScript(target, 'test', {
		extraArgs,
		timeoutSeconds: TEST_TIMEOUT_SECONDS,
		env: { CI: 'true' },
		execOptions,
	});
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
	const targets = resolveChangedTargets();
	if (targets.length === 0) {
		return toCommandResult([
			'WARN no changed handlers/* or modules/* targets detected',
		]);
	}
	return await runTestWithArgs(targets, [], execOptions);
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
	const lines: string[] = [];
	let failCount = 0;
	let passCount = 0;

	for (const target of targets) {
		if (!hasScript(target, 'test')) {
			const warn = `WARN ${target} test: skipped (not in package.json)`;
			printProgress(warn);
			lines.push(warn);
			continue;
		}
		const label =
			extraArgs.length === 0
				? 'test'
				: `test ${extraArgs.map((arg) => JSON.stringify(arg)).join(' ')}`;
		printProgress(`RUN  ${target} ${label}`);
		const result = await runTestForTarget(target, extraArgs, execOptions);
		const durationSeconds = Math.round(result.durationMs / 1000);
		if (result.passed) {
			printProgress(`OK   ${target} test (${durationSeconds}s)`);
			passCount++;
		} else {
			const fail = `FAIL ${target} test (${durationSeconds}s)`;
			printProgress(fail);
			lines.push(fail);
			if (result.excerpt) {
				lines.push(result.excerpt);
			}
			failCount++;
		}
	}

	lines.push(
		failCount === 0
			? `OK   all tests passed (${passCount} target(s))`
			: `FAIL ${failCount} target(s) had test failures`,
	);
	return toCommandResult(lines, failCount === 0 ? 0 : 1);
}
