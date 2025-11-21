export const convertArrayToCsv = <T extends Record<string, unknown>>({
	arr,
}: {
	arr: T[];
}) => {
	if (!arr[0]) {
		return '';
	}

	const headers = Object.keys(arr[0]);

	const headerRow = headers.join(',');

	const dataRows = arr.map((row) => {
		return headers
			.map((header) => {
				const cellValue = String(row[header]).replace(/,/g, '');
				return `"${cellValue}"`;
			})
			.join(',');
	});

	const csvString = [headerRow, ...dataRows].join('\n');

	return csvString;
};
