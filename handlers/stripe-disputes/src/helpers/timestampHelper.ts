/**
 * Converts a Unix timestamp to ISO datetime string for Salesforce
 *
 * @param timestamp - Unix timestamp (seconds since epoch)
 * @returns ISO datetime string (e.g., "2023-01-01T12:00:00.000Z")
 */
export function timestampToSalesforceDateTime(timestamp: number): string {
	return new Date(timestamp * 1000).toISOString();
}

/**
 * Converts a Unix timestamp to ISO date string for Salesforce
 *
 * @param timestamp - Unix timestamp (seconds since epoch)
 * @returns ISO date string (e.g., "2023-01-01")
 * @throws {Error} When the date conversion results in an invalid date
 */
export function timestampToSalesforceDate(timestamp: number): string {
	const date: string | undefined = new Date(timestamp * 1000)
		.toISOString()
		.split('T')[0];
	if (!date) {
		throw new Error(`Invalid timestamp: ${timestamp}`);
	}
	return date;
}
