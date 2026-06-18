import { runNoArgCommand } from '../../cli/commandArgs.js';
import type { CommandDefinition } from '../types.js';
import { runGit } from './git.js';

export default {
	name: 'git_changed_files_staged',
	usage: '',
	description: 'git diff --staged --name-only',
	category: 'Git',
	handler: (args) =>
		runNoArgCommand(args, 'git_changed_files_staged', () =>
			runGit('name-only-staged'),
		),
} satisfies CommandDefinition;
