import { runNoArgCommand } from '../cli/commandArgs.js';
import { runGit } from '../tools/git.js';
import type { CommandDefinition } from './types.js';

export const gitDiffStatCommand: CommandDefinition = {
	name: 'git_diff_stat',
	usage: '',
	description: 'git diff --stat',
	category: 'Git',
	handler: (args) =>
		runNoArgCommand(args, 'git_diff_stat', () => runGit('diff-stat')),
};
