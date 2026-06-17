import {
	type CommandResult,
	getScripts,
	targetExists,
	toCommandResult,
} from './runScript.js';
import { listTargetNames } from './targetRegistry.js';
import { validateTargetAgainstKnownTargets } from './targetValidation.js';

export function listTargets(): CommandResult {
	const targets = listTargetNames();
	return toCommandResult(targets.length > 0 ? targets : ['(no targets found)']);
}

export function validateTargetsTool(targets: string[]): CommandResult {
	const knownTargets = new Set(listTargetNames());
	const results = targets.map((target) => {
		const reason = validateTargetAgainstKnownTargets(target, knownTargets);
		if (reason) {
			return { target, valid: false, reason };
		}
		return { target, valid: true };
	});
	const lines = results.map((result) =>
		result.valid
			? `OK   ${result.target}`
			: `FAIL ${result.target}: ${result.reason}`,
	);
	const failCount = results.filter((result) => !result.valid).length;
	lines.push('');
	lines.push(
		failCount === 0
			? 'OK   all targets valid'
			: `FAIL ${failCount} invalid target(s)`,
	);
	return toCommandResult(lines, failCount === 0 ? 0 : 1);
}

export function showTargetScripts(target: string): CommandResult {
	if (!targetExists(target)) {
		return toCommandResult([`FAIL ${target}: target does not exist`], 1);
	}
	const scripts = getScripts(target);
	if (scripts.length === 0) {
		return toCommandResult([`WARN ${target}: no scripts found`]);
	}
	return toCommandResult([`Scripts for ${target}:`, '', ...scripts]);
}
