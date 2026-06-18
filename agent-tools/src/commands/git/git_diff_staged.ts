import { runNoArgCommand } from '../../cli/commandArgs.js';
import type { CommandDefinition } from '../types.js';
import { runGit } from './git.js';

export const gitDiffStagedCommand: CommandDefinition = {
	name: 'git_diff_staged',
	usage: '',
	description: 'git diff --staged --minimal',
	category: 'Git',
	handler: (args) =>
		runNoArgCommand(args, 'git_diff_staged', () => runGit('diff-staged')),
};
