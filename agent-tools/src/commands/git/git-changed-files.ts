import { runNoArgCommand } from '../../cli/commandArgs.js';
import type { CommandDefinition } from '../types.js';
import { runGit } from './git.js';

export default {
	name: 'git-changed-files',
	usage: '',
	description: 'git diff --name-only',
	category: 'Git',
	handler: (args) =>
		runNoArgCommand(args, 'git-changed-files', () => runGit('name-only')),
} satisfies CommandDefinition;
