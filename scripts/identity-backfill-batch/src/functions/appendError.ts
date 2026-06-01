import { appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { ERRORS_FILE, ERRORS_HEADER } from '../constants';
import type { ICsvRow } from '../interfaces';
import { csvRow } from './csvRow';
import { ensureHeader } from './ensureHeader';
import { pickEmail } from './pickEmail';

export function appendError(
	outputDir: string,
	row: ICsvRow,
	httpStatus: number | null,
	reason: string,
): void {
	const path = join(outputDir, ERRORS_FILE);
	ensureHeader(path, ERRORS_HEADER);
	appendFileSync(
		path,
		csvRow([
			new Date().toISOString(),
			pickEmail(row) ?? '',
			row.sub_id,
			row.sub_number,
			row.sf_product,
			String(httpStatus ?? ''),
			reason,
		]),
	);
}
