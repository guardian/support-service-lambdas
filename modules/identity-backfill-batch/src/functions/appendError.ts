import { appendFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ICsvRow } from '../interfaces';
import { csvRow } from './csvRow';
import { ensureHeader } from './ensureHeader';
import { pickEmail } from './pickEmail';

const HEADER =
	'timestamp,email,sub_id,sub_number,sf_product,http_status,reason\n';

export function appendError(
	outputDir: string,
	row: ICsvRow,
	httpStatus: number | null,
	reason: string,
): void {
	const path = join(outputDir, 'errors.csv');
	ensureHeader(path, HEADER);
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
