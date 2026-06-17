import { parseRequiredTargets } from '../cli/commandArgs.js';
import { runLintFix, runLintFixChanged } from '../tools/repair.js';
import type { CommandDefinition } from './types.js';

export const lintFixCommand: CommandDefinition = {
	name: 'lint_fix',
	usage: '<target...> | --changed',
	description: 'run lint --fix',
	category: 'Fix',
	handler: async (args, context) => {
		const parsed = parseRequiredTargets(args, 'lint_fix');
		if ('exitCode' in parsed) {
			return parsed;
		}
		if (parsed.changed) {
			return await runLintFixChanged(context.execOptions);
		}
		return await runLintFix(parsed.targets, context.execOptions);
	},
};
