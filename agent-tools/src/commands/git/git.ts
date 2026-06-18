import {
	runNoArgCommand,
	runSingleTargetCommand,
} from '../../cli/commandArgs.js';
import type { CommandResult, ExecutionOptions } from '../../tools/runScript.js';
import { runRootCommand } from '../../tools/runScript.js';
import type { CommandDefinition } from '../types.js';

async function runGit(
	args: string[],
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	const result = await runRootCommand('git', ['--no-pager', ...args], {
		execOptions,
	});
	if (!result.passed) {
		return { output: result.output || 'git command failed', exitCode: 1 };
	}
	return { output: result.output || '(no output)', exitCode: 0 };
}

async function runGitForTarget(
	args: string[],
	target: string,
	execOptions: ExecutionOptions,
): Promise<CommandResult> {
	return runGit([...args, '--', target], execOptions);
}

export function gitCommand(name: string, gitArgs: string[]): CommandDefinition {
	return {
		name,
		usage: '',
		description: `git ${gitArgs.join(' ')}`,
		category: 'Git',
		handler: (args, context) =>
			runNoArgCommand(args, name, () => runGit(gitArgs, context.execOptions)),
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
		handler: (args, context) =>
			runSingleTargetCommand(args, name, (target) =>
				runGitForTarget(gitArgs, target, context.execOptions),
			),
	};
}
