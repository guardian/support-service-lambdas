import { spawnSync } from 'child_process';
import {
	runNoArgCommand,
	runSingleTargetCommand,
} from '../../cli/commandArgs.js';
import {
	type CommandResult,
	ROOT,
	toCommandResult,
} from '../../tools/runScript.js';
import type { CommandDefinition } from '../types.js';

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

function runGit(args: string[]): CommandResult {
	return execGit(args);
}

function runGitForTarget(args: string[], target: string): CommandResult {
	return execGit([...args, '--', target]);
}

export function gitCommand(name: string, gitArgs: string[]): CommandDefinition {
	return {
		name,
		usage: '',
		description: `git ${gitArgs.join(' ')}`,
		category: 'Git',
		handler: (args) => runNoArgCommand(args, name, () => runGit(gitArgs)),
	};
}

export function gitTargetCommand(
	name: string,
	gitArgs: string[],
): CommandDefinition {
	return {
		name,
		usage: '<target>',
		description: `git ${gitArgs.join(' ')} for one target`,
		category: 'Git',
		handler: (args) =>
			runSingleTargetCommand(args, name, (target) =>
				runGitForTarget(gitArgs, target),
			),
	};
}
