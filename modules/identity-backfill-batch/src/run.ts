import { PROGRESS_REPORT_EVERY } from './constants';
import {
	appendError,
	appendProcessed,
	appendRejected,
	callBackfill,
	createOutputDir,
	eta,
	filterRows,
	loadConfig,
	loadState,
	parseArgs,
	pickEmail,
	readCsv,
	saveState,
	sleep,
	writeSummary,
} from './functions';
import type { IApiConfig, IArgs, ICsvRow, IState } from './interfaces';
import type { ApiOutcome } from './types';

async function main(): Promise<void> {
	const args: IArgs = parseArgs(process.argv.slice(2));
	const config: IApiConfig = loadConfig(args.stage);
	const outputDir = createOutputDir(args.stage);
	const state: IState = loadState(outputDir);
	const startedAt = new Date();

	console.log(`identity-backfill-batch — ${args.stage}`);
	console.log(`output: ${outputDir}`);

	const allRows: ICsvRow[] = readCsv(args.csv);
	const filtered: ICsvRow[] = filterRows(allRows, args.filter);
	const limited: ICsvRow[] = args.limit
		? filtered.slice(0, args.limit)
		: filtered;
	const todo: ICsvRow[] = limited.filter((r: ICsvRow) => {
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
		await processRow(row, email, args, config, outputDir, state, intervalMs);

		if (count % PROGRESS_REPORT_EVERY === 0 || count === todo.length) {
			saveState(outputDir, state);
			console.log(
				`[${count}/${todo.length}] ok=${state.processed.size} rejected=${state.rejected.size} errors=${state.errored.size} eta=${eta(count, todo.length, startedAt)}`,
			);
		}

		await sleep(intervalMs);
	}

	saveState(outputDir, state);
	writeSummary(outputDir, state, args.stage, startedAt, todo.length);
	console.log(`\ndone. summary written to ${outputDir}/summary.txt`);
}

async function processRow(
	row: ICsvRow,
	email: string,
	args: IArgs,
	config: IApiConfig,
	outputDir: string,
	state: IState,
	intervalMs: number,
): Promise<void> {
	const dryRun: ApiOutcome = await callBackfill(config, email, true);

	if (dryRun.kind === 'rejected') {
		appendRejected(outputDir, row, dryRun.reason);
		state.rejected.add(email);
		return;
	}
	if (dryRun.kind === 'error') {
		appendError(
			outputDir,
			row,
			dryRun.httpStatus,
			`[dry-run] ${dryRun.reason}`,
		);
		state.errored.add(email);
		return;
	}

	if (args.dryRunOnly) {
		appendProcessed(outputDir, row, dryRun.identityId, 'dry-run-only');
		state.processed.add(email);
		return;
	}

	await sleep(intervalMs);
	const real: ApiOutcome = await callBackfill(config, email, false);
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

main().catch((err: unknown) => {
	console.error(err);
	process.exit(1);
});
