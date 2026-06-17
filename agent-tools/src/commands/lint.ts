import { parseRequiredTargets } from '../cli/commandArgs.js';
import { runLint, runLintChanged } from '../tools/verify.js';
import type { CommandDefinition } from './types.js';

export const lintCommand: CommandDefinition = {
	name: 'lint',
	usage: '<target...> | --changed',
	description: 'run lint',
	category: 'Verification',
	handler: async (args, context) => {
		const parsed = parseRequiredTargets(args, 'lint');
		if ('exitCode' in parsed) {
			return parsed;
		}
		if (parsed.changed) {
			return await runLintChanged(context.execOptions);
		}
		return await runLint(parsed.targets, context.execOptions);
	},
};
