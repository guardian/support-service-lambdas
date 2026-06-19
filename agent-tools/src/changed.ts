import { spawnSync } from 'child_process';
import { existsSync, readdirSync } from 'fs';
import { resolve } from 'path';

const PACKAGE_PREFIXES = ['handlers', 'modules'] as const;
const TOP_LEVEL_PACKAGES = ['cdk', 'buildcheck'] as const;

export function listPackages(root: string): string[] {
	const packages: string[] = [];
	for (const pkg of TOP_LEVEL_PACKAGES) {
		if (existsSync(resolve(root, pkg))) {
			packages.push(pkg);
		}
	}
	for (const prefix of PACKAGE_PREFIXES) {
		const dir = resolve(root, prefix);
		if (!existsSync(dir)) {
			continue;
		}
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			if (entry.isDirectory()) {
				packages.push(`${prefix}/${entry.name}`);
			}
		}
	}
	return packages.sort();
}

export function resolveChangedPackages(root: string): string[] {
	const result = spawnSync(
		'git',
		['--no-pager', 'status', '--short', '--untracked-files=all'],
		{ cwd: root, encoding: 'utf-8' },
	);
	if (result.status !== 0) {
		return [];
	}
	const files = result.stdout
		.split('\n')
		.map((line) => (line.length >= 4 ? line.slice(3).trim() : null))
		.filter((p): p is string => !!p)
		.map((path) => {
			const parts = path.split(' -> ');
			return parts[parts.length - 1]!;
		});
	const known = listPackages(root).sort((a, b) => b.length - a.length);
	const matched = new Set<string>();
	for (const file of files) {
		const pkg = known.find((c) => file === c || file.startsWith(`${c}/`));
		if (pkg) {
			matched.add(pkg);
		}
	}
	return Array.from(matched).sort();
}
