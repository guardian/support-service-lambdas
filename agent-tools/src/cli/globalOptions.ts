import { toCommandResult } from '../tools/runScript.js';
import type { CommandResult } from '../tools/runScript.js';

export type ParsedGlobalOptions = {
	positionals: string[];
	tailLines: number | null;
	grepPattern: string | null;
};

export function parseGlobalOptions(
	args: string[],
): ParsedGlobalOptions | CommandResult {
	const positionals: string[] = [];
	let tailLines: number | null = null;
	let grepPattern: string | null = null;

	function fail(message: string): CommandResult {
		return toCommandResult([`FAIL ${message}`], 1);
	}

	for (let i = 0; i < args.length; i += 1) {
		const arg = args[i]!;
		if (arg === '--tail') {
			const raw = args[i + 1];
			if (!raw) {
				return fail('--tail requires a numeric value');
			}
			const parsed = Number.parseInt(raw, 10);
			if (!Number.isFinite(parsed) || parsed <= 0) {
				return fail(`invalid --tail value: ${raw}`);
			}
			tailLines = parsed;
			i += 1;
			continue;
		}
		if (arg === '--grep') {
			const raw = args[i + 1];
			if (!raw) {
				return fail('--grep requires a regex pattern');
			}
			try {
				new RegExp(raw);
			} catch {
				return fail(`invalid --grep pattern: ${raw}`);
			}
			grepPattern = raw;
			i += 1;
			continue;
		}
		positionals.push(arg);
	}

	return { positionals, tailLines, grepPattern };
}
