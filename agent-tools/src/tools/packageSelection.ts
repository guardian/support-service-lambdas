import { spawnSync } from 'child_process';
import { listPackages } from './packageRegistry.js';
import { ROOT } from './runScript.js';

function parseStatusPath(line: string): string | null {
	if (line.length < 4) {
		return null;
	}
	const path = line.slice(3).trim();
	if (!path) {
		return null;
	}
	const renameParts = path.split(' -> ');
	return renameParts[renameParts.length - 1] ?? null;
}

function readGitChangedFiles(): string[] {
	const result = spawnSync(
		'git',
		['--no-pager', 'status', '--short', '--untracked-files=all'],
		{ cwd: ROOT, encoding: 'utf-8' },
	);
	if (result.status !== 0) {
		return [];
	}
	return result.stdout
		.split('\n')
		.map((line) => parseStatusPath(line))
		.filter((line): line is string => !!line);
}

export function getAllChangedFiles(): string[] {
	return Array.from(new Set(readGitChangedFiles()));
}

export function mapFilesToPackages(files: string[]): string[] {
	const known = listPackages().sort((a, b) => b.length - a.length);
	const matched = new Set<string>();
	for (const file of files) {
		const pkg = known.find(
			(candidate) => file === candidate || file.startsWith(`${candidate}/`),
		);
		if (pkg) {
			matched.add(pkg);
		}
	}
	return Array.from(matched).sort();
}

export function resolveChangedPackages(): string[] {
	return mapFilesToPackages(getAllChangedFiles());
}
