const parseCsvLine = (line: string): string[] => {
	const values: string[] = [];
	let current = '';
	let inQuotes = false;

	for (let index = 0; index < line.length; index += 1) {
		const char = line[index];

		if (char === '"') {
			const next = line[index + 1];
			if (inQuotes && next === '"') {
				current += '"';
				index += 1;
			} else {
				inQuotes = !inQuotes;
			}
			continue;
		}

		if (char === ',' && !inQuotes) {
			values.push(current);
			current = '';
			continue;
		}

		current += char;
	}

	values.push(current);
	return values;
};

export { parseCsvLine };

export const parseCsvWithHeader = (
	csvContent: string,
): Array<Record<string, string>> => {
	const lines = csvContent
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line.length > 0);

	if (lines.length === 0) {
		return [];
	}

	const header = parseCsvLine(lines[0] ?? '');
	const dataLines = lines.slice(1);

	return dataLines.map((line) => {
		const values = parseCsvLine(line);
		return header.reduce<Record<string, string>>((acc, key, index) => {
			acc[key] = values[index] ?? '';
			return acc;
		}, {});
	});
};

/**
 * Parses a CSV from an async line generator, yielding one decoded row object at
 * a time. The first line is treated as the header. Keeps only a single row in
 * memory at once, making it suitable for very large files.
 */
export async function* parseCsvStreamWithHeader(
	lines: AsyncIterable<string> | Iterable<string>,
): AsyncGenerator<Record<string, string>> {
	// Wrap in an async generator so we can uniformly await .next() on both
	// sync (Generator) and async (AsyncGenerator) inputs
	async function* toAsync(): AsyncGenerator<string> {
		yield* lines;
	}
	const iter = toAsync();

	const firstLine = await iter.next();
	if (firstLine.done === true || firstLine.value.trim().length === 0) {
		return;
	}

	const header = parseCsvLine(firstLine.value);

	for await (const line of iter) {
		const values = parseCsvLine(line);
		yield header.reduce<Record<string, string>>((acc, key, index) => {
			acc[key] = values[index] ?? '';
			return acc;
		}, {});
	}
}
