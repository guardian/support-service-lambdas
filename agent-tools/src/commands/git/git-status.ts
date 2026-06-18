import { runNoArgCommand } from '../../cli/commandArgs.js';
import type { CommandDefinition } from '../types.js';
import { runGit } from './git.js';

export default {
	name: 'git-status',
	usage: '',
	description: 'git status --short',
	category: 'Git',
	handler: (args) =>
		runNoArgCommand(args, 'git-status', () => runGit('status')),
} satisfies CommandDefinition;
