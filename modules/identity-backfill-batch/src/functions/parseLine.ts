/**
 * Minimal CSV line parser. Handles double-quote escaping ("") and quoted fields
 * containing commas. Does not support embedded newlines, which BQ output never produces.
 */
export function parseLine(line: string): string[] {
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
