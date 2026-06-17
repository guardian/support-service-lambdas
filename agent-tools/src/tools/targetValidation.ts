export const targetFormatDescription =
	'handlers/<name>, modules/<name>, cdk, or buildcheck';

const TARGET_RE = /^(handlers|modules)\/[a-zA-Z0-9._-]+$|^(cdk|buildcheck)$/;

export function isValidTargetFormat(target: string): boolean {
	return TARGET_RE.test(target);
}

export function invalidTargetFormatReason(): string {
	return `invalid format (expected ${targetFormatDescription})`;
}

export function validateTargetAgainstKnownTargets(
	target: string,
	knownTargets: ReadonlySet<string>,
): string | null {
	if (!isValidTargetFormat(target)) {
		return invalidTargetFormatReason();
	}
	if (!knownTargets.has(target)) {
		return 'target does not exist';
	}
	return null;
}
