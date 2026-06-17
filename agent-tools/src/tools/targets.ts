import {
	type CommandResult,
	getScripts,
	targetExists,
	toCommandResult,
} from './runScript.js';
import { listTargetNames } from './targetRegistry.js';

const TARGET_RE = /^(handlers|modules)\/[a-zA-Z0-9._-]+$/;

export function listTargets(): CommandResult {
	const targets = listTargetNames();
	return toCommandResult(targets.length > 0 ? targets : ['(no targets found)']);
}

export function validateTargetsTool(targets: string[]): CommandResult {
	const knownTargets = new Set(listTargetNames());
	const results = targets.map((target) => {
		if (!TARGET_RE.test(target)) {
			return {
				target,
				valid: false,
				reason: 'invalid format (expected handlers/<name> or modules/<name>)',
			};
		}
		if (!knownTargets.has(target)) {
			return { target, valid: false, reason: 'target does not exist' };
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
