/**
 * Returns a slice from the right up to and including the first element matching the predicate.
 */
function takeRightUntil<T>(arr: T[], predicate: (item: T) => boolean): T[] {
	const idx = arr.length - 1 - arr.slice().reverse().findIndex(predicate);
	return idx >= 0 ? arr.slice(idx) : [];
}

// look at the stack to work out the caller's details
// be careful about refactoring things that call this as by design it's not referentially transparent
export function getCallerInfo(
	extraFrames: number = 0,
	stack: string[] | undefined = new Error().stack?.split('\n'),
): string {
	// [0] Error, [1] at getCallerInfo, [2] at caller (internal to logger), then [3] actual code
	const callerLine = stack?.[3 + extraFrames] ?? '';
	const match =
		callerLine.match(
			/at\s+([^\s]+)\s+\[as\s+[^\]]+\]\s+\(([^:]+):(\d+):\d+\)/,
		) ??
		callerLine.match(/at\s+([^\s]+)\s+\(([^:]+):(\d+):\d+\)/) ??
		callerLine.match(/at\s+([^\s]+)\s+\((.*):(\d+):\d+\)/) ??
		callerLine.match(/at\s+(.*):(\d+):\d+/);
	if (match) {
		const functionName = match[1]?.trim();
		let filename = match[2]?.trim();
		const lineNumber = match[3]?.trim();

		// only take the leaf name (for compactness)
		if (filename?.includes('/')) {
			const pathParts = filename.split('/');
			const commonNames = ['index.ts', 'src'];
			filename = takeRightUntil(
				pathParts,
				(part) => !commonNames.includes(part),
			).join('/');
		}

		return (
			filename + ':' + lineNumber + (functionName ? '::' + functionName : '')
		);
	}
	return '';
}
