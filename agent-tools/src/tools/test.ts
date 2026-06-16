import { resolve } from 'path';
import {
	getScriptCommand,
	hasScript,
	ROOT,
	runScript,
	type ScriptResult,
	type ToolResult,
	toToolResult,
} from './runScript.js';
import { resolveChangedTargets } from './targetSelection.js';

const TEST_TIMEOUT_SECONDS = 600;

function scriptLooksLikeIntegration(script: string): boolean {
	const lower = script.toLowerCase();
	return lower.includes('group=integration') || lower.includes('it-test');
}

function safeRelativePath(filePath: string): string | null {
	const normalized = filePath.replace(/^\/+/, '');
	if (normalized.includes('..')) {
		return null;
	}
	const abs = resolve(ROOT, normalized);
	if (!abs.startsWith(ROOT)) {
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

function runTestWithArgs(targets: string[], extraArgs: string[]): ToolResult {
	const lines: string[] = [];
	let failCount = 0;
	let passCount = 0;

	for (const target of targets) {
		lines.push(`\n--- ${target} ---`);

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
	return toToolResult(lines);
}

export function runTest(targets: string[]): ToolResult {
	return runTestWithArgs(targets, []);
}

export function runTestChanged(): ToolResult {
	const targets = resolveChangedTargets();
	if (targets.length === 0) {
		return toToolResult([
			'WARN no changed handlers/* or modules/* targets detected',
		]);
	}
	return runTestWithArgs(targets, []);
}

export function runTestOne(target: string, pattern: string): ToolResult {
	return runTestWithArgs([target], ['--testPathPattern', pattern]);
}

export function runTestFile(target: string, filePath: string): ToolResult {
	const safePath = safeRelativePath(filePath);
	if (!safePath) {
		return toToolResult([`FAIL invalid filePath: ${filePath}`]);
	}
	if (!safePath.startsWith(`${target}/`)) {
		return toToolResult([
			`FAIL filePath must be inside target ${target}: ${filePath}`,
		]);
	}
	return runTestWithArgs([target], [safePath]);
}
