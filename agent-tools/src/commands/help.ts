import { packageFormatDescription } from '../tools/packageValidation.js';
import { toCommandResult } from '../tools/runScript.js';
import type { CommandCategory, CommandDefinition } from './types.js';

function buildHelpLines(
	definitions: readonly CommandDefinition[],
	categories: readonly CommandCategory[],
): string[] {
	const lines: string[] = [
		'Usage:',
		'  ./agent-tool <command> [args...] [--tail N] [--grep PATTERN]',
		'',
		'Commands:',
	];

	for (const category of categories) {
		const categoryCommands = definitions.filter(
			(definition) => definition.category === category,
		);
		if (categoryCommands.length === 0) {
			continue;
		}
		lines.push(`  ${category}:`);
		for (const definition of categoryCommands) {
			const usage = definition.usage.length > 0 ? ` ${definition.usage}` : '';
			lines.push(`    ${definition.name}${usage} - ${definition.description}`);
		}
		lines.push('');
	}

	lines.push(
		'Global options:',
		'  --tail N        include N trailing lines for failures and stream full output to a temp log file',
		'  --grep PATTERN  only stream subcommand output lines that match the regex pattern',
		'',
		'Notes:',
		'  - Full child command output streams by default.',
		`  - Packages must be ${packageFormatDescription}.`,
		'  - Use the absolute wrapper path if your Copilot approvals are path-specific.',
	);

	return lines;
}

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
