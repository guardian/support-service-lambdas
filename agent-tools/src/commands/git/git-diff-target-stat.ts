import { runSingleTargetCommand } from '../../cli/commandArgs.js';
import type { CommandDefinition } from '../types.js';
import { runGitForTarget } from './git.js';

export default {
	name: 'git-diff-target-stat',
	usage: '<target>',
	description: 'git diff --stat for one target',
	category: 'Git',
	handler: (args) =>
		runSingleTargetCommand(args, 'git-diff-target-stat', (target) =>
			runGitForTarget('diff-target-stat', target),
		),
} satisfies CommandDefinition;
