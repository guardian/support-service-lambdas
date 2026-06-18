import { runSingleTargetCommand } from '../../cli/commandArgs.js';
import type { CommandDefinition } from '../types.js';
import { runGitForTarget } from './git.js';

export default {
	name: 'git_diff_target_stat',
	usage: '<target>',
	description: 'git diff --stat for one target',
	category: 'Git',
	handler: (args) =>
		runSingleTargetCommand(args, 'git_diff_target_stat', (target) =>
			runGitForTarget('diff-target-stat', target),
		),
} satisfies CommandDefinition;
