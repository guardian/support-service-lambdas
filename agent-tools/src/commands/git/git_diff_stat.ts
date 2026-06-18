import { runNoArgCommand } from '../../cli/commandArgs.js';
import type { CommandDefinition } from '../types.js';
import { runGit } from './git.js';

export const gitDiffStatCommand: CommandDefinition = {
	name: 'git_diff_stat',
	usage: '',
	description: 'git diff --stat',
	category: 'Git',
	handler: (args) =>
		runNoArgCommand(args, 'git_diff_stat', () => runGit('diff-stat')),
};
