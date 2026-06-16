import { spawnSync } from 'child_process';
import { ROOT, type ToolResult, toToolResult } from './runScript.js';

type GitSubcommand =
	| 'status'
	| 'diff'
	| 'diff-staged'
	| 'diff-stat'
	| 'diff-staged-stat'
	| 'name-only'
	| 'name-only-staged'
	| 'diff-target'
	| 'diff-target-stat';

const GIT_COMMANDS: Record<GitSubcommand, string[]> = {
	status: ['status', '--short'],
	diff: ['diff', '--minimal'],
	'diff-staged': ['diff', '--staged', '--minimal'],
	'diff-stat': ['diff', '--stat'],
	'diff-staged-stat': ['diff', '--staged', '--stat'],
	'name-only': ['diff', '--name-only'],
	'name-only-staged': ['diff', '--staged', '--name-only'],
	'diff-target': ['diff', '--minimal'],
	'diff-target-stat': ['diff', '--stat'],
};

function execGit(args: string[]): ToolResult {
	const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf-8' });
	const stdout = result.stdout.trim();
	const stderr = result.stderr.trim();
	const output = [stdout, stderr].filter(Boolean).join('\n');
	if (result.status !== 0) {
		throw new Error(`git command failed:\n${output}`);
	}
	return toToolResult([output.length > 0 ? output : '(no output)']);
}

export function runGit(
	sub: Exclude<GitSubcommand, 'diff-target' | 'diff-target-stat'>,
): ToolResult {
	return execGit(GIT_COMMANDS[sub]);
}

export function runGitForTarget(
	sub: 'diff-target' | 'diff-target-stat',
	target: string,
): ToolResult {
	const baseArgs = GIT_COMMANDS[sub];
	return execGit([...baseArgs, '--', target]);
}
