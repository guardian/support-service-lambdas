import { runNoArgCommand } from '../cli/commandArgs.js';
import { runGit } from '../tools/git.js';
import type { CommandDefinition } from './types.js';

export const gitStatusCommand: CommandDefinition = {
	name: 'git_status',
	usage: '',
	description: 'git status --short',
	category: 'Git',
	handler: (args) =>
		runNoArgCommand(args, 'git_status', () => runGit('status')),
};
