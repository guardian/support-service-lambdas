import { parseRequiredTargets } from '../cli/commandArgs.js';
import { runTest, runTestChanged } from '../tools/test.js';
import type { CommandDefinition } from './types.js';

const safetyNote =
	'test executes repository code, forces CI=true, and uses fixed timeouts';

export const testCommand: CommandDefinition = {
	name: 'test',
	usage: '<target...> | --changed',
	description: 'run test with CI=true and fixed timeout',
	category: 'Test',
	safetyNote,
	handler: async (args, context) => {
		const parsed = parseRequiredTargets(args, 'test');
		if ('exitCode' in parsed) {
			return parsed;
		}
		if (parsed.changed) {
			return await runTestChanged(context.execOptions);
		}
		return await runTest(parsed.targets, context.execOptions);
	},
};
