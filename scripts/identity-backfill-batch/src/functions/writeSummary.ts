import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { SUMMARY_FILE } from '../constants';
import type { IState } from '../interfaces';
import type { Stage } from '../types';
import { formatDuration } from './formatDuration';

export function writeSummary(
	outputDir: string,
	state: IState,
	stage: Stage,
	startedAt: Date,
	totalToProcess: number,
): void {
	const durationMs = Date.now() - startedAt.getTime();
	const lines = [
		`Identity backfill batch — summary`,
		`Stage:           ${stage}`,
		`Started at:      ${startedAt.toISOString()}`,
		`Duration:        ${formatDuration(durationMs)}`,
		`Total to process: ${totalToProcess}`,
		`Successful:      ${state.processed.size}`,
		`Rejected:        ${state.rejected.size}`,
		`Errors:          ${state.errored.size}`,
		``,
	];
	writeFileSync(join(outputDir, SUMMARY_FILE), lines.join('\n'));
}
