import { runSingleTargetCommand } from '../../cli/commandArgs.js';
import type { CommandDefinition } from '../types.js';
import { runGitForTarget } from './git.js';

export const gitDiffTargetCommand: CommandDefinition = {
	name: 'git_diff_target',
	usage: '<target>',
	description: 'git diff --minimal for one target',
	category: 'Git',
	handler: (args) =>
		runSingleTargetCommand(args, 'git_diff_target', (target) =>
			runGitForTarget('diff-target', target),
		),
};
