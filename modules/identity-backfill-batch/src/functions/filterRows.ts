import type { ICsvRow } from '../interfaces';
import type { FilterMode } from '../types';

export function filterRows(rows: ICsvRow[], mode: FilterMode): ICsvRow[] {
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
