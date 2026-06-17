import { existsSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { ROOT } from './runScript.js';

const TARGET_PREFIXES = ['handlers', 'modules'] as const;
const TOP_LEVEL_TARGETS = ['cdk', 'buildcheck'] as const;

export function listTargetNames(): string[] {
	const targets: string[] = [];

	for (const target of TOP_LEVEL_TARGETS) {
		const dir = resolve(ROOT, target);
		if (existsSync(dir)) {
			targets.push(target);
		}
	}

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
