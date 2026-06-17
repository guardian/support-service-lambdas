import { resolve } from 'path';
import {
	type CommandResult,
	getScriptCommand,
	hasScript,
	ROOT,
	runScript,
	type ScriptResult,
	toCommandResult,
} from './runScript.js';
import { resolveChangedTargets } from './targetSelection.js';

const TEST_TIMEOUT_SECONDS = 600;

function scriptLooksLikeIntegration(script: string): boolean {
	const lower = script.toLowerCase();
	return (
		/\bit-test\b/.test(lower) ||
		/\bgroup(?:=|\s+)integration\b/.test(lower) ||
		/\bintegration\b/.test(lower)
	);
}

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

function runTestForTarget(target: string, extraArgs: string[]): ScriptResult {
	return runScript(target, 'test', {
		extraArgs,
		timeoutSeconds: TEST_TIMEOUT_SECONDS,
		env: { CI: 'true' },
	});
}

// test executes repository code, so this command stays in CI mode, blocks integration-like scripts, and keeps a fixed timeout.
function runTestWithArgs(
	targets: string[],
	extraArgs: string[],
): CommandResult {
	const lines: string[] = [];
	let failCount = 0;
	let passCount = 0;

	for (const target of targets) {
		lines.push('', `--- ${target} ---`);

		if (!hasScript(target, 'test')) {
			lines.push('  WARN test: skipped (not in package.json)');
			continue;
		}

		const testScript = getScriptCommand(target, 'test') ?? '';
		if (scriptLooksLikeIntegration(testScript)) {
			lines.push('  FAIL test blocked: integration-like test script detected');
			failCount++;
			continue;
		}

		const start = Date.now();
		const result: ScriptResult = runTestForTarget(target, extraArgs);
		const durationSeconds = Math.round((Date.now() - start) / 1000);
		if (result.passed) {
			lines.push(`  OK   test passed (${durationSeconds}s)`);
			passCount++;
		} else {
			lines.push(`  FAIL test failed (${durationSeconds}s)`);
			failCount++;
		}
		if (result.output) {
			lines.push(result.output);
		}
	}

	lines.push('');
	lines.push(
		failCount === 0
			? `OK   all tests passed (${passCount} target(s))`
			: `FAIL ${failCount} target(s) had test failures`,
	);
	return toCommandResult(lines, failCount === 0 ? 0 : 1);
}

export function runTest(targets: string[]): CommandResult {
	return runTestWithArgs(targets, []);
}

export function runTestChanged(): CommandResult {
	const targets = resolveChangedTargets();
	if (targets.length === 0) {
		return toCommandResult([
			'WARN no changed handlers/* or modules/* targets detected',
		]);
	}
	return runTestWithArgs(targets, []);
}

export function runTestOne(target: string, pattern: string): CommandResult {
	return runTestWithArgs([target], ['--testPathPattern', pattern]);
}

export function runTestFile(target: string, filePath: string): CommandResult {
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
	return runTestWithArgs([target], [safePath]);
}
