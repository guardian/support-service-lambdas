export function escapeSoqlLiteral(value: string): string {
	return value.replaceAll('\\', '\\\\').replaceAll("'", "\\'");
}
