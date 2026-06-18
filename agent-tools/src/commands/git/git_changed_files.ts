import { runNoArgCommand } from '../../cli/commandArgs.js';
import type { CommandDefinition } from '../types.js';
import { runGit } from './git.js';

export default {
	name: 'git_changed_files',
	usage: '',
	description: 'git diff --name-only',
	category: 'Git',
	handler: (args) =>
		runNoArgCommand(args, 'git_changed_files', () => runGit('name-only')),
} satisfies CommandDefinition;
