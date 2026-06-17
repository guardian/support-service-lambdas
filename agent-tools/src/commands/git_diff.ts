import { runNoArgCommand } from '../cli/commandArgs.js';
import { runGit } from '../tools/git.js';
import type { CommandDefinition } from './types.js';

export const gitDiffCommand: CommandDefinition = {
	name: 'git_diff',
	usage: '',
	description: 'git diff --minimal',
	category: 'Git',
	handler: (args) => runNoArgCommand(args, 'git_diff', () => runGit('diff')),
};
