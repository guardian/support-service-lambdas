import {
	type CommandResult,
	hasScript,
	runScript,
	type ScriptResult,
	toCommandResult,
} from './runScript.js';
import { resolveChangedTargets } from './targetSelection.js';

const REPAIR_STEPS: ReadonlyArray<{ script: string; extraArgs: string[] }> = [
	{ script: 'fix-formatting', extraArgs: [] },
	{ script: 'lint', extraArgs: ['--fix'] },
];

export function runRepair(targets: string[]): CommandResult {
	const lines: string[] = [];
	let failCount = 0;

	for (const target of targets) {
		lines.push('', `--- ${target} ---`);

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
	lines.push('INFO run verify after repair to confirm type-check results.');
	return toCommandResult(lines, failCount === 0 ? 0 : 1);
}

export function runRepairChanged(): CommandResult {
	const targets = resolveChangedTargets();
	if (targets.length === 0) {
		return toCommandResult([
			'WARN no changed handlers/* or modules/* targets detected',
		]);
	}
	return runRepair(targets);
}
