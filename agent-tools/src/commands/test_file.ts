import { fail, requireSingleTarget } from '../cli/commandArgs.js';
import { runTestFile } from '../tools/test.js';
import type { CommandDefinition } from './types.js';

const safetyNote =
	'test executes repository code, forces CI=true, and uses fixed timeouts';

export const testFileCommand: CommandDefinition = {
	name: 'test_file',
	usage: '<target> <filePath>',
	description: 'run tests in one target for a specific file path',
	category: 'Test',
	safetyNote,
	handler: async (args, context) => {
		if (args.length !== 2) {
			return fail('test_file requires exactly one target and one filePath');
		}
		const target = requireSingleTarget([args[0]!], 'test_file');
		if ('exitCode' in target) {
			return target;
		}
		return await runTestFile(target.target, args[1]!, context.execOptions);
	},
};
