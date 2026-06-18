import { runNoArgCommand } from '../../cli/commandArgs.js';
import type { CommandDefinition } from '../types.js';
import { runGit } from './git.js';

export default {
	name: 'git-diff-staged',
	usage: '',
	description: 'git diff --staged --minimal',
	category: 'Git',
	handler: (args) =>
		runNoArgCommand(args, 'git-diff-staged', () => runGit('diff-staged')),
} satisfies CommandDefinition;
