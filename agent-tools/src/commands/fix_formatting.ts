import { parseRequiredTargets } from '../cli/commandArgs.js';
import { runFixFormatting, runFixFormattingChanged } from '../tools/repair.js';
import type { CommandDefinition } from './types.js';

export const fixFormattingCommand: CommandDefinition = {
	name: 'fix_formatting',
	usage: '<target...> | --changed',
	description: 'run fix-formatting',
	category: 'Fix',
	handler: async (args, context) => {
		const parsed = parseRequiredTargets(args, 'fix_formatting');
		if ('exitCode' in parsed) {
			return parsed;
		}
		if (parsed.changed) {
			return await runFixFormattingChanged(context.execOptions);
		}
		return await runFixFormatting(parsed.targets, context.execOptions);
	},
};
