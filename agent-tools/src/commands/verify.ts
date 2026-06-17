import { parseRequiredTargets } from '../cli/commandArgs.js';
import { runVerify, runVerifyChanged } from '../tools/verify.js';
import type { CommandDefinition } from './types.js';

export const verifyCommand: CommandDefinition = {
	name: 'verify',
	usage: '<target...> | --changed',
	description: 'run check-formatting + lint + type-check',
	category: 'Verification',
	handler: async (args, context) => {
		const parsed = parseRequiredTargets(args, 'verify');
		if ('exitCode' in parsed) {
			return parsed;
		}
		if (parsed.changed) {
			return await runVerifyChanged(context.execOptions);
		}
		return await runVerify(parsed.targets, context.execOptions);
	},
};
