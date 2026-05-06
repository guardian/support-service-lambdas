import { escapeCsv } from './escapeCsv';

export function csvRow(values: string[]): string {
	return values.map(escapeCsv).join(',') + '\n';
}
