import { existsSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { ROOT } from './runScript.js';

const PACKAGE_PREFIXES = ['handlers', 'modules'] as const;
const TOP_LEVEL_PACKAGES = ['cdk', 'buildcheck'] as const;

export function listPackages(): string[] {
	const packages: string[] = [];

	for (const pkg of TOP_LEVEL_PACKAGES) {
		const dir = resolve(ROOT, pkg);
		if (existsSync(dir)) {
			packages.push(pkg);
		}
	}

	for (const prefix of PACKAGE_PREFIXES) {
		const dir = resolve(ROOT, prefix);
		if (!existsSync(dir)) {
			continue;
		}
		const entries = readdirSync(dir, { withFileTypes: true });
		for (const entry of entries) {
			if (entry.isDirectory()) {
				packages.push(`${prefix}/${entry.name}`);
			}
		}
	}

	return packages.sort();
}
