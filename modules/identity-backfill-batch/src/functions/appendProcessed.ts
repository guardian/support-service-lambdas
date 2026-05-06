import { appendFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ICsvRow } from '../interfaces';
import type { WriteMode } from '../types';
import { csvRow } from './csvRow';
import { ensureHeader } from './ensureHeader';
import { pickEmail } from './pickEmail';

const HEADER =
	'timestamp,email,sub_id,sub_number,sf_product,identity_id,mode\n';

export function appendProcessed(
	outputDir: string,
	row: ICsvRow,
	identityId: string | null,
	mode: WriteMode,
): void {
	const path = join(outputDir, 'processed.csv');
	ensureHeader(path, HEADER);
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
