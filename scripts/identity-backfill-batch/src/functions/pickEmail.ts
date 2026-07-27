import type { ICsvRow } from '../interfaces';

export function pickEmail(row: ICsvRow): string | null {
	return row.sf_contact_email || row.zuora_bill_to_email || null;
}
