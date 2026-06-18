import { buildHelpLines } from '../cli/helpText.js';
import { toCommandResult } from '../tools/runScript.js';
import type { CommandCategory, CommandDefinition } from './types.js';

export function makeHelpCommand(
	allCommands: readonly CommandDefinition[],
	categories: readonly CommandCategory[],
): CommandDefinition {
	return {
		name: 'help',
		usage: '',
		description: 'show this help',
		category: 'Utility',
		handler: () =>
			Promise.resolve(
				toCommandResult(buildHelpLines(allCommands, categories), 0),
			),
	};
}
