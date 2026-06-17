import { runNoArgCommand } from '../cli/commandArgs.js';
import { runGit } from '../tools/git.js';
import type { CommandDefinition } from './types.js';

export const gitChangedFilesStagedCommand: CommandDefinition = {
	name: 'git_changed_files_staged',
	usage: '',
	description: 'git diff --staged --name-only',
	category: 'Git',
	handler: (args) =>
		runNoArgCommand(args, 'git_changed_files_staged', () =>
			runGit('name-only-staged'),
		),
};
