export const convertArrayToCsv = <T>({ arr }: { arr: T[] }) => {
	if (!arr[0]) return '';

	const headers = Object.keys(arr[0]);

	const headerRow = headers.join(',');

	const dataRows = arr.map((row) => {
		return headers
			.map((header) => {
				const cellValue = String(
					(row as Record<string, unknown>)[header],
				).replace(/,/g, ' ');
				return `"${cellValue}"`;
			})
			.join(',');
	});

	const csvString = [headerRow, ...dataRows].join('\n');

	return csvString;
};
