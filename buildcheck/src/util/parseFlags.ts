/**
 * Converts an array of --key=value flag strings into a Record<string, string>.
 * Flags not matching --key=value are ignored (they will fail zod validation).
 */
export function parseFlags(argv: string[]): Record<string, string> {
	const result: Record<string, string> = {};
	for (const arg of argv) {
		const match = /^--([^=]+)=(.+)$/.exec(arg);
		if (match) {
			result[match[1]] = match[2];
		}
	}
	return result;
}
