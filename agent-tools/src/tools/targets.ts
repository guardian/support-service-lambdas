import { existsSync, readdirSync } from 'fs';
import { resolve } from 'path';
import {
	getScripts,
	ROOT,
	targetExists,
	type ToolResult,
	toToolResult,
} from './runScript.js';

const TARGET_PREFIXES = ['handlers', 'modules'] as const;

export function listTargetNames(): string[] {
	const targets: string[] = [];

	for (const prefix of TARGET_PREFIXES) {
		const dir = resolve(ROOT, prefix);
		if (!existsSync(dir)) {
			continue;
		}
		const entries = readdirSync(dir, { withFileTypes: true });
		for (const entry of entries) {
			if (entry.isDirectory()) {
				targets.push(`${prefix}/${entry.name}`);
			}
		}
	}

	return targets.sort();
}

export function listTargets(): ToolResult {
	const targets = listTargetNames();

	return toToolResult([
		'Available targets for verify, repair, and test:',
		'',
		...targets,
	]);
}

export function validateTargetsTool(targets: string[]): ToolResult {
	const knownTargets = new Set(listTargetNames());
	const results = targets.map((target) => {
		if (!/^(handlers|modules)\/[a-zA-Z0-9._-]+$/.test(target)) {
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
	return toToolResult(lines);
}

export function showTargetScripts(target: string): ToolResult {
	if (!targetExists(target)) {
		return toToolResult([`FAIL ${target}: target does not exist`]);
	}
	const scripts = getScripts(target);
	if (scripts.length === 0) {
		return toToolResult([`WARN ${target}: no scripts found`]);
	}
	return toToolResult([`Scripts for ${target}:`, '', ...scripts]);
}
