import { runNoArgCommand } from '../../cli/commandArgs.js';
import type { CommandDefinition } from '../types.js';
import { runGit } from './git.js';

export default {
	name: 'git-diff',
	usage: '',
	description: 'git diff --minimal',
	category: 'Git',
	handler: (args) => runNoArgCommand(args, 'git-diff', () => runGit('diff')),
} satisfies CommandDefinition;
