import { runNoArgCommand } from '../../cli/commandArgs.js';
import type { CommandDefinition } from '../types.js';
import { runGit } from './git.js';

export default {
	name: 'git-changed-files-staged',
	usage: '',
	description: 'git diff --staged --name-only',
	category: 'Git',
	handler: (args) =>
		runNoArgCommand(args, 'git-changed-files-staged', () =>
			runGit('name-only-staged'),
		),
} satisfies CommandDefinition;
