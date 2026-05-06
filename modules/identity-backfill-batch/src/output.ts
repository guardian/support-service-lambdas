import {
	appendFileSync,
	existsSync,
	mkdirSync,
	readFileSync,
	writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import type { CsvRow } from './csv';

const stateFileSchema = z.object({
	processed: z.array(z.string()).optional(),
	rejected: z.array(z.string()).optional(),
	errored: z.array(z.string()).optional(),
});

export type State = {
	processed: Set<string>;
	rejected: Set<string>;
	errored: Set<string>;
};

export function createOutputDir(stage: string): string {
	const home = process.env.HOME ?? '.';
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
	const dir = join(
		home,
		'Downloads',
		'identity-backfill-batch-results',
		`${stage}-${timestamp}`,
	);
	mkdirSync(dir, { recursive: true });
	return dir;
}

export function loadState(outputDir: string): State {
	const path = join(outputDir, 'state.json');
	if (!existsSync(path)) {
		return { processed: new Set(), rejected: new Set(), errored: new Set() };
	}
	const raw = stateFileSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
	return {
		processed: new Set(raw.processed ?? []),
		rejected: new Set(raw.rejected ?? []),
		errored: new Set(raw.errored ?? []),
	};
}

export function saveState(outputDir: string, state: State): void {
	const path = join(outputDir, 'state.json');
	const payload = {
		processed: [...state.processed],
		rejected: [...state.rejected],
		errored: [...state.errored],
	};
	writeFileSync(path, JSON.stringify(payload, null, 2));
}

const HEADERS = {
	processed: 'timestamp,email,sub_id,sub_number,sf_product,identity_id,mode\n',
	rejected: 'timestamp,email,sub_id,sub_number,sf_product,reason\n',
	errors: 'timestamp,email,sub_id,sub_number,sf_product,http_status,reason\n',
};

function ensureHeader(path: string, header: string): void {
	if (!existsSync(path)) {
		writeFileSync(path, header);
	}
}

export function appendProcessed(
	outputDir: string,
	row: CsvRow,
	identityId: string | null,
	mode: 'dry-run-only' | 'real',
): void {
	const path = join(outputDir, 'processed.csv');
	ensureHeader(path, HEADERS.processed);
	appendFileSync(
		path,
		csvRow([
			new Date().toISOString(),
			pickEmailForLog(row),
			row.sub_id,
			row.sub_number,
			row.sf_product,
			identityId ?? '',
			mode,
		]),
	);
}

export function appendRejected(
	outputDir: string,
	row: CsvRow,
	reason: string,
): void {
	const path = join(outputDir, 'rejected.csv');
	ensureHeader(path, HEADERS.rejected);
	appendFileSync(
		path,
		csvRow([
			new Date().toISOString(),
			pickEmailForLog(row),
			row.sub_id,
			row.sub_number,
			row.sf_product,
			reason,
		]),
	);
}

export function appendError(
	outputDir: string,
	row: CsvRow,
	httpStatus: number | null,
	reason: string,
): void {
	const path = join(outputDir, 'errors.csv');
	ensureHeader(path, HEADERS.errors);
	appendFileSync(
		path,
		csvRow([
			new Date().toISOString(),
			pickEmailForLog(row),
			row.sub_id,
			row.sub_number,
			row.sf_product,
			String(httpStatus ?? ''),
			reason,
		]),
	);
}

export function writeSummary(
	outputDir: string,
	state: State,
	stage: string,
	startedAt: Date,
	totalToProcess: number,
): void {
	const durationMs = Date.now() - startedAt.getTime();
	const duration = formatDuration(durationMs);
	const lines = [
		`Identity backfill batch — summary`,
		`Stage:           ${stage}`,
		`Started at:      ${startedAt.toISOString()}`,
		`Duration:        ${duration}`,
		`Total to process: ${totalToProcess}`,
		`Successful:      ${state.processed.size}`,
		`Rejected:        ${state.rejected.size}`,
		`Errors:          ${state.errored.size}`,
		``,
	];
	writeFileSync(join(outputDir, 'summary.txt'), lines.join('\n'));
}

function pickEmailForLog(row: CsvRow): string {
	return row.sf_contact_email || row.zuora_bill_to_email || '';
}

function csvRow(values: string[]): string {
	return values.map(escapeCsv).join(',') + '\n';
}

function escapeCsv(v: string): string {
	if (v.includes(',') || v.includes('"') || v.includes('\n')) {
		return `"${v.replace(/"/g, '""')}"`;
	}
	return v;
}

function formatDuration(ms: number): string {
	const s = Math.floor(ms / 1000);
	const m = Math.floor(s / 60);
	return `${m}m ${s % 60}s`;
}
