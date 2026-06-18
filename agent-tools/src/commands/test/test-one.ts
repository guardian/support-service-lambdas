import { fail, requireSingleTarget } from '../../cli/commandArgs.js';
import type { CommandDefinition } from '../types.js';
import { runTestWithArgs } from './testStep.js';

const safetyNote =
	'test executes repository code, forces CI=true, and uses fixed timeouts';

export default {
	name: 'test-one',
	usage: '<target> <pattern>',
	description: 'run tests in one target matching --testPathPattern',
	category: 'Test',
	safetyNote,
	handler: async (args, context) => {
		if (args.length < 2) {
			return fail('test-one requires a target and a pattern');
		}
		const target = requireSingleTarget([args[0]!], 'test-one');
		if ('exitCode' in target) {
			return target;
		}
		return await runTestWithArgs(
			[target.target],
			['--testPathPattern', args.slice(1).join(' ')],
			context.execOptions,
		);
	},
} satisfies CommandDefinition;
