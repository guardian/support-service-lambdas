import {
	hasScript,
	runScript,
	type ScriptResult,
	type ToolResult,
	toToolResult,
} from './runScript.js';
import { resolveChangedTargets } from './targetSelection.js';

const REPAIR_STEPS: ReadonlyArray<{ script: string; extraArgs: string[] }> = [
	{ script: 'fix-formatting', extraArgs: [] },
	{ script: 'lint', extraArgs: ['--fix'] },
];

export function runRepair(targets: string[]): ToolResult {
	const lines: string[] = [];
	let failCount = 0;

	for (const target of targets) {
		lines.push(`\n--- ${target} ---`);

		for (const { script, extraArgs } of REPAIR_STEPS) {
			if (!hasScript(target, script)) {
				lines.push(`  WARN ${script}: skipped (not in package.json)`);
				continue;
			}
			const label =
				extraArgs.length > 0 ? `${script} ${extraArgs.join(' ')}` : script;
			const result: ScriptResult = runScript(target, script, { extraArgs });
			if (result.passed) {
				lines.push(`  OK   ${label}`);
				if (result.output) {
					lines.push(result.output);
				}
			} else {
				lines.push(`  FAIL ${label}`);
				if (result.output) {
					lines.push(result.output);
				}
				failCount++;
			}
		}
	}

	lines.push('');
	lines.push(
		failCount === 0
			? 'OK   repair complete'
			: `FAIL ${failCount} step(s) failed`,
	);
	lines.push(
		'INFO type errors cannot be auto-repaired; run verify after repair.',
	);
	return toToolResult(lines);
}

export function runRepairChanged(): ToolResult {
	const targets = resolveChangedTargets();
	if (targets.length === 0) {
		return toToolResult([
			'WARN no changed handlers/* or modules/* targets detected',
		]);
	}
	return runRepair(targets);
}
