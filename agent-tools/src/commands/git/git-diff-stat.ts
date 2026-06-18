import { runNoArgCommand } from '../../cli/commandArgs.js';
import type { CommandDefinition } from '../types.js';
import { runGit } from './git.js';

export default {
	name: 'git-diff-stat',
	usage: '',
	description: 'git diff --stat',
	category: 'Git',
	handler: (args) =>
		runNoArgCommand(args, 'git-diff-stat', () => runGit('diff-stat')),
} satisfies CommandDefinition;
