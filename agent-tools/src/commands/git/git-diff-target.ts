import { runSingleTargetCommand } from '../../cli/commandArgs.js';
import type { CommandDefinition } from '../types.js';
import { runGitForTarget } from './git.js';

export default {
	name: 'git-diff-target',
	usage: '<target>',
	description: 'git diff --minimal for one target',
	category: 'Git',
	handler: (args) =>
		runSingleTargetCommand(args, 'git-diff-target', (target) =>
			runGitForTarget('diff-target', target),
		),
} satisfies CommandDefinition;
