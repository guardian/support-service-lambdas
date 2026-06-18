import { packageFormatDescription } from '../tools/packageValidation.js';
import { toCommandResult } from '../tools/runScript.js';
import type { CommandDefinition } from './types.js';

function buildHelpLines(definitions: readonly CommandDefinition[]): string[] {
	const lines: string[] = [
		'Usage:',
		'  ./agent-tool <command> [args...] [--tail N] [--grep PATTERN]',
		'',
		'Commands:',
	];

	for (const definition of definitions) {
		const usage = definition.usage.length > 0 ? ` ${definition.usage}` : '';
		lines.push(`  ${definition.name}${usage} - ${definition.description}`);
	}

	lines.push(
		'',
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
): CommandDefinition {
	return {
		name: 'help',
		usage: '',
		description: 'show this help',
		handler: () =>
			Promise.resolve(toCommandResult(buildHelpLines(allCommands), 0)),
	};
}
