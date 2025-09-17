export function timestampToSalesforceDateTime(timestamp: number): string {
	return new Date(timestamp * 1000).toISOString();
}

export function timestampToSalesforceDate(timestamp: number): string {
	const date: string | undefined = new Date(timestamp * 1000)
		.toISOString()
		.split('T')[0];
	if (!date) {
		throw new Error(`Invalid timestamp: ${timestamp}`);
	}
	return date;
}
