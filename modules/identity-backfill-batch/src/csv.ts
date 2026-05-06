import { readFileSync } from 'node:fs';

export type CsvRow = {
	sub_id: string;
	sub_number: string;
	subscription_end_date: string;
	sub_status: string;
	zuora_bill_to_email: string;
	sf_contact_email: string;
	identity_status: string;
	sf_product: string;
	account_crm_id: string;
};

export type FilterMode = 'has-identity-id' | 'no-identity-id' | 'all';

const REQUIRED_COLUMNS = [
	'sub_id',
	'sub_number',
	'subscription_end_date',
	'sub_status',
	'zuora_bill_to_email',
	'sf_contact_email',
	'identity_status',
	'sf_product',
	'account_crm_id',
] as const;

export function readCsv(path: string): CsvRow[] {
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
	for (const col of REQUIRED_COLUMNS) {
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
	return lines.slice(1).map((line) => {
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

export function filterRows(rows: CsvRow[], mode: FilterMode): CsvRow[] {
	switch (mode) {
		case 'all':
			return rows;
		case 'has-identity-id':
			return rows.filter((r) => r.identity_status === 'Has Identity ID');
		case 'no-identity-id':
			return rows.filter(
				(r) =>
					r.identity_status === 'Has Identity ID' ||
					r.identity_status === 'No Identity ID',
			);
	}
}

export function pickEmail(row: CsvRow): string | null {
	return row.sf_contact_email || row.zuora_bill_to_email || null;
}

// Minimal CSV parser. BQ output uses simple quoting and no embedded newlines in our columns.
function parseLine(line: string): string[] {
	const out: string[] = [];
	let cur = '';
	let inQuotes = false;
	for (let i = 0; i < line.length; i++) {
		const c = line[i];
		if (inQuotes) {
			if (c === '"' && line[i + 1] === '"') {
				cur += '"';
				i++;
			} else if (c === '"') {
				inQuotes = false;
			} else {
				cur += c;
			}
		} else {
			if (c === '"') {
				inQuotes = true;
			} else if (c === ',') {
				out.push(cur);
				cur = '';
			} else {
				cur += c;
			}
		}
	}
	out.push(cur);
	return out;
}
