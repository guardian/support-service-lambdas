export const packageFormatDescription =
	'handlers/<name>, modules/<name>, cdk, or buildcheck';

const PACKAGE_RE = /^(handlers|modules)\/[a-zA-Z0-9._-]+$|^(cdk|buildcheck)$/;

export function isValidPackageFormat(pkg: string): boolean {
	return PACKAGE_RE.test(pkg);
}

export function invalidPackageFormatReason(): string {
	return `invalid format (expected ${packageFormatDescription})`;
}

export function validatePackageAgainstKnown(
	pkg: string,
	knownPackages: ReadonlySet<string>,
): string | null {
	if (!isValidPackageFormat(pkg)) {
		return invalidPackageFormatReason();
	}
	if (!knownPackages.has(pkg)) {
		return 'package does not exist';
	}
	return null;
}
