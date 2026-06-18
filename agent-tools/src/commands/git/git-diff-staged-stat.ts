import { runNoArgCommand } from '../../cli/commandArgs.js';
import type { CommandDefinition } from '../types.js';
import { runGit } from './git.js';

export default {
	name: 'git-diff-staged-stat',
	usage: '',
	description: 'git diff --staged --stat',
	category: 'Git',
	handler: (args) =>
		runNoArgCommand(args, 'git-diff-staged-stat', () =>
			runGit('diff-staged-stat'),
		),
} satisfies CommandDefinition;
