import { appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { PROCESSED_FILE, PROCESSED_HEADER } from '../constants';
import type { ICsvRow } from '../interfaces';
import type { WriteMode } from '../types';
import { csvRow } from './csvRow';
import { ensureHeader } from './ensureHeader';
import { pickEmail } from './pickEmail';

export function appendProcessed(
	outputDir: string,
	row: ICsvRow,
	identityId: string | null,
	mode: WriteMode,
): void {
	const path = join(outputDir, PROCESSED_FILE);
	ensureHeader(path, PROCESSED_HEADER);
	appendFileSync(
		path,
		csvRow([
			new Date().toISOString(),
			pickEmail(row) ?? '',
			row.sub_id,
			row.sub_number,
			row.sf_product,
			identityId ?? '',
			mode,
		]),
	);
}
