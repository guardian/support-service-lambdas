import { parseRequiredTargets } from '../cli/commandArgs.js';
import { runTypeCheck, runTypeCheckChanged } from '../tools/verify.js';
import type { CommandDefinition } from './types.js';

export const typeCheckCommand: CommandDefinition = {
	name: 'type_check',
	usage: '<target...> | --changed',
	description: 'run type-check',
	category: 'Verification',
	handler: async (args, context) => {
		const parsed = parseRequiredTargets(args, 'type_check');
		if ('exitCode' in parsed) {
			return parsed;
		}
		if (parsed.changed) {
			return await runTypeCheckChanged(context.execOptions);
		}
		return await runTypeCheck(parsed.targets, context.execOptions);
	},
};
