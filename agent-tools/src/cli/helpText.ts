import type { CommandCategory, CommandDefinition } from '../commands/types.js';
import { targetFormatDescription } from '../tools/targetValidation.js';

function collectSafetyNotes(
	definitions: readonly CommandDefinition[],
): string[] {
	return Array.from(
		new Set(
			definitions.reduce<string[]>((notes, definition) => {
				if (
					'safetyNote' in definition &&
					typeof definition.safetyNote === 'string'
				) {
					notes.push(definition.safetyNote);
				}
				return notes;
			}, []),
		),
	);
}

export function buildHelpLines(
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
		`  - Targets must be ${targetFormatDescription}.`,
		'  - Use the absolute wrapper path if your Copilot approvals are path-specific.',
	);

	for (const note of collectSafetyNotes(definitions)) {
		lines.push(`  - ${note}.`);
	}

	return lines;
}
