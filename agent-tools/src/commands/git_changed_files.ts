import { runNoArgCommand } from '../cli/commandArgs.js';
import { runGit } from '../tools/git.js';
import type { CommandDefinition } from './types.js';

export const gitChangedFilesCommand: CommandDefinition = {
	name: 'git_changed_files',
	usage: '',
	description: 'git diff --name-only',
	category: 'Git',
	handler: (args) =>
		runNoArgCommand(args, 'git_changed_files', () => runGit('name-only')),
};
