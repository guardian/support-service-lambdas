import { z } from 'zod';
import { callBackfill, sleep } from './api';
import { filterRows, pickEmail, readCsv } from './csv';
import {
	appendError,
	appendProcessed,
	appendRejected,
	createOutputDir,
	loadState,
	saveState,
	writeSummary,
} from './output';

const filterEnum = z.enum(['has-identity-id', 'no-identity-id', 'all']);

const argsSchema = z.object({
	stage: z.enum(['CODE', 'PROD']),
	csv: z.string().min(1),
	rps: z.number().int().min(1).max(20).default(5),
	dryRunOnly: z.boolean().default(false),
	filter: filterEnum.default('has-identity-id'),
	limit: z.number().int().min(1).optional(),
});

type Args = z.infer<typeof argsSchema>;

function parseArgs(argv: string[]): Args {
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

function loadConfig(stage: 'CODE' | 'PROD'): { url: string; apiKey: string } {
	const url = process.env[`IDENTITY_BACKFILL_URL_${stage}`];
	const apiKey = process.env[`IDENTITY_BACKFILL_API_KEY_${stage}`];
	if (!url || !apiKey) {
		throw new Error(
			`Missing env vars. Set IDENTITY_BACKFILL_URL_${stage} and IDENTITY_BACKFILL_API_KEY_${stage}.\n` +
				`See README for how to retrieve them via aws cli with the membership profile.`,
		);
	}
	return { url, apiKey };
}

function eta(
	processedCount: number,
	totalCount: number,
	startedAt: Date,
): string {
	if (processedCount === 0) {
		return 'computing...';
	}
	const elapsedMs = Date.now() - startedAt.getTime();
	const remaining =
		(elapsedMs / processedCount) * (totalCount - processedCount);
	const minutes = Math.round(remaining / 60000);
	return `~${minutes}min`;
}

async function main() {
	const args = parseArgs(process.argv.slice(2));
	const config = loadConfig(args.stage);
	const outputDir = createOutputDir(args.stage);
	const state = loadState(outputDir);
	const startedAt = new Date();

	console.log(`identity-backfill-batch — ${args.stage}`);
	console.log(`output: ${outputDir}`);

	const allRows = readCsv(args.csv);
	const filtered = filterRows(allRows, args.filter);
	const limited = args.limit ? filtered.slice(0, args.limit) : filtered;
	const todo = limited.filter((r) => {
		const email = pickEmail(r);
		if (!email) {
			return false;
		}
		return (
			!state.processed.has(email) &&
			!state.rejected.has(email) &&
			!state.errored.has(email)
		);
	});

	console.log(`csv total:       ${allRows.length}`);
	console.log(`filter applied:  ${args.filter} -> ${filtered.length}`);
	console.log(`limit:           ${args.limit ?? 'none'} -> ${limited.length}`);
	console.log(
		`already done:    ${state.processed.size + state.rejected.size + state.errored.size}`,
	);
	console.log(`to process:      ${todo.length}`);
	console.log(
		`mode:            ${args.dryRunOnly ? 'dry-run-only' : 'dry-run + real'}`,
	);
	console.log(`rate:            ${args.rps} req/s`);
	console.log('');

	const intervalMs = Math.ceil(1000 / args.rps);
	let count = 0;

	for (const row of todo) {
		const email = pickEmail(row);
		if (!email) {
			continue;
		}
		count++;

		const dryRun = await callBackfill(config, email, true);

		if (dryRun.kind === 'rejected') {
			appendRejected(outputDir, row, dryRun.reason);
			state.rejected.add(email);
		} else if (dryRun.kind === 'error') {
			appendError(
				outputDir,
				row,
				dryRun.httpStatus,
				`[dry-run] ${dryRun.reason}`,
			);
			state.errored.add(email);
		} else {
			if (args.dryRunOnly) {
				appendProcessed(outputDir, row, dryRun.identityId, 'dry-run-only');
				state.processed.add(email);
			} else {
				await sleep(intervalMs);
				const real = await callBackfill(config, email, false);
				if (real.kind === 'success') {
					appendProcessed(outputDir, row, real.identityId, 'real');
					state.processed.add(email);
				} else if (real.kind === 'rejected') {
					appendRejected(outputDir, row, `[post-dryrun] ${real.reason}`);
					state.rejected.add(email);
				} else {
					appendError(outputDir, row, real.httpStatus, `[real] ${real.reason}`);
					state.errored.add(email);
				}
			}
		}

		if (count % 25 === 0 || count === todo.length) {
			saveState(outputDir, state);
			const eta_str = eta(count, todo.length, startedAt);
			console.log(
				`[${count}/${todo.length}] ok=${state.processed.size} rejected=${state.rejected.size} errors=${state.errored.size} eta=${eta_str}`,
			);
		}

		await sleep(intervalMs);
	}

	saveState(outputDir, state);
	writeSummary(outputDir, state, args.stage, startedAt, todo.length);
	console.log(`\ndone. summary written to ${outputDir}/summary.txt`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
