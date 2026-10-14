import { escapeCsv } from './escapeCsv';

export function csvRow(values: string[]): string {
	return values.map((v) => escapeCsv(v)).join(',') + '\n';
}
