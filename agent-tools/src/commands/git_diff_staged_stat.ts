import { runNoArgCommand } from '../cli/commandArgs.js';
import { runGit } from '../tools/git.js';
import type { CommandDefinition } from './types.js';

export const gitDiffStagedStatCommand: CommandDefinition = {
	name: 'git_diff_staged_stat',
	usage: '',
	description: 'git diff --staged --stat',
	category: 'Git',
	handler: (args) =>
		runNoArgCommand(args, 'git_diff_staged_stat', () =>
			runGit('diff-staged-stat'),
		),
};
