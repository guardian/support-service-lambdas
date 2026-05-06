import { IDENTITY_STATUS_HAS, IDENTITY_STATUS_NONE } from '../constants';
import type { ICsvRow } from '../interfaces';
import type { FilterMode } from '../types';

export function filterRows(rows: ICsvRow[], mode: FilterMode): ICsvRow[] {
	switch (mode) {
		case 'all':
			return rows;
		case 'has-identity-id':
			return rows.filter(
				(r: ICsvRow) => r.identity_status === IDENTITY_STATUS_HAS,
			);
		case 'no-identity-id':
			return rows.filter(
				(r: ICsvRow) =>
					r.identity_status === IDENTITY_STATUS_HAS ||
					r.identity_status === IDENTITY_STATUS_NONE,
			);
	}
}
