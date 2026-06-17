import { fail } from '../cli/commandArgs.js';
import { validateTargetsTool } from '../tools/targets.js';
import type { CommandDefinition } from './types.js';

export const validateTargetsCommand: CommandDefinition = {
	name: 'validate_targets',
	usage: '<target...>',
	description: 'validate target names and formats',
	category: 'Utility',
	handler: (args) => {
		if (args.length === 0) {
			return Promise.resolve(
				fail('validate_targets requires at least one target'),
			);
		}
		return Promise.resolve(validateTargetsTool(args));
	},
};
