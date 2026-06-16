import { spawnSync } from 'child_process';
import { ROOT } from './runScript.js';
import { listTargetNames } from './targets.js';

export type TargetValidation = {
	target: string;
	valid: boolean;
	reason?: string;
};

const TARGET_RE = /^(handlers|modules)\/[a-zA-Z0-9._-]+$/;

export function validateTargets(targets: string[]): TargetValidation[] {
	const knownTargets = new Set(listTargetNames());
	return targets.map((target) => {
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
}

function readGitChangedFiles(staged: boolean): string[] {
	const args = staged
		? ['diff', '--staged', '--name-only']
		: ['diff', '--name-only'];
	const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf-8' });
	if (result.status !== 0) {
		return [];
	}
	return result.stdout
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean);
}

export function getAllChangedFiles(): string[] {
	return Array.from(
		new Set([...readGitChangedFiles(false), ...readGitChangedFiles(true)]),
	);
}

export function mapFilesToTargets(files: string[]): string[] {
	const knownTargets = listTargetNames();
	const matched = new Set<string>();
	for (const file of files) {
		for (const target of knownTargets) {
			if (file === target || file.startsWith(`${target}/`)) {
				matched.add(target);
			}
		}
	}
	return Array.from(matched).sort();
}

export function resolveChangedTargets(): string[] {
	return mapFilesToTargets(getAllChangedFiles());
}
