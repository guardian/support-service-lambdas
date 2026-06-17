import {
	type CommandResult,
	hasScript,
	runScript,
	type ScriptResult,
	toCommandResult,
} from './runScript.js';
import { resolveChangedTargets } from './targetSelection.js';

const VERIFY_SCRIPTS = ['check-formatting', 'lint', 'type-check'] as const;

export function runVerify(targets: string[]): CommandResult {
	const lines: string[] = [];
	let failCount = 0;

	for (const target of targets) {
		lines.push('', `--- ${target} ---`);
		let targetFailed = false;

		for (const script of VERIFY_SCRIPTS) {
			if (!hasScript(target, script)) {
				lines.push(`  WARN ${script}: skipped (not in package.json)`);
				continue;
			}
			const result: ScriptResult = runScript(target, script);
			if (result.passed) {
				lines.push(`  OK   ${script}`);
			} else {
				lines.push(`  FAIL ${script}`);
				if (result.output) {
					lines.push(result.output);
				}
				failCount++;
				targetFailed = true;
			}
		}

		if (!targetFailed) {
			lines.push('  OK   all checks passed');
		}
	}

	lines.push('');
	lines.push(
		failCount === 0
			? 'OK   all checks passed'
			: `FAIL ${failCount} check(s) failed`,
	);
	return toCommandResult(lines, failCount === 0 ? 0 : 1);
}

export function runVerifyChanged(): CommandResult {
	const targets = resolveChangedTargets();
	if (targets.length === 0) {
		return toCommandResult([
			'WARN no changed handlers/* or modules/* targets detected',
		]);
	}
	return runVerify(targets);
}
