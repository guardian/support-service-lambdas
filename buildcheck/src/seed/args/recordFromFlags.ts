/**
 * Converts an array of --key=value flag strings into a Record<string, string>.
 * Flags not matching --key=value are rejected
 */
export function recordFromFlags(argv: string[]): Record<string, string> {
	const result: Record<string, string> = {};
	for (const arg of argv) {
		const match = /^--([^=]+)=(.+)$/.exec(arg);
		if (match) {
			result[match[1]] = match[2];
		} else {
			throw new Error(
				'Invalid argument "' + arg + '" - should be of the form --key=value',
			);
		}
	}
	return result;
}
