import { appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { REJECTED_FILE, REJECTED_HEADER } from '../constants';
import type { ICsvRow } from '../interfaces';
import { csvRow } from './csvRow';
import { ensureHeader } from './ensureHeader';
import { pickEmail } from './pickEmail';

export function appendRejected(
	outputDir: string,
	row: ICsvRow,
	reason: string,
): void {
	const path = join(outputDir, REJECTED_FILE);
	ensureHeader(path, REJECTED_HEADER);
	appendFileSync(
		path,
		csvRow([
			new Date().toISOString(),
			pickEmail(row) ?? '',
			row.sub_id,
			row.sub_number,
			row.sf_product,
			reason,
		]),
	);
}
