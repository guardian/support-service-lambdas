export function escapeCsv(v: string): string {
	if (v.includes(',') || v.includes('"') || v.includes('\n')) {
		return `"${v.replace(/"/g, '""')}"`;
	}
	return v;
}
