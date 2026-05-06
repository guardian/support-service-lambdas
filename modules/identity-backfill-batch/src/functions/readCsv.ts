import { readFileSync } from 'node:fs';
import { CSV_REQUIRED_COLUMNS } from '../constants';
import type { ICsvRow } from '../interfaces';
import { parseLine } from './parseLine';

export function readCsv(path: string): ICsvRow[] {
	const content = readFileSync(path, 'utf8');
	const lines = content.split('\n').filter((l) => l.length > 0);
	if (lines.length === 0) {
		throw new Error(`CSV is empty: ${path}`);
	}

	const headerLine = lines[0];
	if (!headerLine) {
		throw new Error(`CSV header missing: ${path}`);
	}
	const header = parseLine(headerLine);
	for (const col of CSV_REQUIRED_COLUMNS) {
		if (!header.includes(col)) {
			throw new Error(
				`CSV missing required column "${col}". Found: ${header.join(', ')}`,
			);
		}
	}
	const idx: Record<string, number> = {};
	header.forEach((h, i) => {
		idx[h] = i;
	});

	const get = (fields: string[], col: string): string => {
		const at = idx[col];
		return at !== undefined ? (fields[at] ?? '') : '';
	};

	return lines.slice(1).map((line): ICsvRow => {
		const fields = parseLine(line);
		return {
			sub_id: get(fields, 'sub_id'),
			sub_number: get(fields, 'sub_number'),
			subscription_end_date: get(fields, 'subscription_end_date'),
			sub_status: get(fields, 'sub_status'),
			zuora_bill_to_email: get(fields, 'zuora_bill_to_email'),
			sf_contact_email: get(fields, 'sf_contact_email'),
			identity_status: get(fields, 'identity_status'),
			sf_product: get(fields, 'sf_product'),
			account_crm_id: get(fields, 'account_crm_id'),
		};
	});
}
