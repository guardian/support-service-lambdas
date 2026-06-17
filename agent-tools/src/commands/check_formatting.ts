import { parseRequiredTargets } from '../cli/commandArgs.js';
import {
	runCheckFormatting,
	runCheckFormattingChanged,
} from '../tools/verify.js';
import type { CommandDefinition } from './types.js';

export const checkFormattingCommand: CommandDefinition = {
	name: 'check_formatting',
	usage: '<target...> | --changed',
	description: 'run check-formatting',
	category: 'Verification',
	handler: async (args, context) => {
		const parsed = parseRequiredTargets(args, 'check_formatting');
		if ('exitCode' in parsed) {
			return parsed;
		}
		if (parsed.changed) {
			return await runCheckFormattingChanged(context.execOptions);
		}
		return await runCheckFormatting(parsed.targets, context.execOptions);
	},
};
