import { spawnSync } from 'child_process';
import { type CommandResult, ROOT, toCommandResult } from './runScript.js';

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

function execGit(args: string[]): CommandResult {
	const result = spawnSync('git', ['--no-pager', ...args], {
		cwd: ROOT,
		encoding: 'utf-8',
	});
	const stdout = result.stdout.trim();
	const stderr = result.stderr.trim();
	const output = [stdout, stderr].filter(Boolean).join('\n');
	if (result.status !== 0) {
		return toCommandResult(
			[output.length > 0 ? output : 'git command failed'],
			1,
		);
	}
	return toCommandResult([output.length > 0 ? output : '(no output)']);
}

export function runGit(
	sub: Exclude<GitSubcommand, 'diff-target' | 'diff-target-stat'>,
): CommandResult {
	return execGit(GIT_COMMANDS[sub]);
}

export function runGitForTarget(
	sub: 'diff-target' | 'diff-target-stat',
	target: string,
): CommandResult {
	const baseArgs = GIT_COMMANDS[sub];
	return execGit([...baseArgs, '--', target]);
}
