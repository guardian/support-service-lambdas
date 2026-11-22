import type { IArgs } from '../interfaces';
import { argsSchema } from '../schemas';

export function parseArgs(argv: string[]): IArgs {
	const raw: Record<string, unknown> = {};
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (!a?.startsWith('--')) {
			continue;
		}
		const key = a.slice(2);
		if (key === 'dry-run-only') {
			raw.dryRunOnly = true;
			continue;
		}
		const next = argv[i + 1];
		if (next === undefined || next.startsWith('--')) {
			raw[key] = true;
			continue;
		}
		raw[key] = key === 'rps' || key === 'limit' ? Number(next) : next;
		i++;
	}
	return argsSchema.parse(raw);
}
