import { fail, requireSingleTarget } from '../../cli/commandArgs.js';
import { runSingleStep } from '../../tools/targetScriptRunner.js';
import type { CommandDefinition } from '../types.js';

export default {
	name: 'test-one',
	usage: '<target> <pattern>',
	description: 'run tests in one target matching a path pattern',
	category: 'Test',
	handler: async (args, context) => {
		if (args.length < 2) {
			return fail('test-one requires a target and a pattern');
		}
		const target = requireSingleTarget([args[0]!], 'test-one');
		if ('exitCode' in target) {
			return target;
		}
		const pattern = args.slice(1).join(' ');
		return await runSingleStep(
			[target.target],
			{
				script: 'test',
				label: `test ${pattern}`,
				summaryLabel: 'test',
				extraArgs: [pattern],
			},
			context.execOptions,
		);
	},
} satisfies CommandDefinition;
