import { runNoArgCommand } from '../../cli/commandArgs.js';
import type { CommandDefinition } from '../types.js';
import { runGit } from './git.js';

export const gitStatusCommand: CommandDefinition = {
	name: 'git_status',
	usage: '',
	description: 'git status --short',
	category: 'Git',
	handler: (args) =>
		runNoArgCommand(args, 'git_status', () => runGit('status')),
};
