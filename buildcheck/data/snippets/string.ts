export function toPascalCase(name: string): string {
	return name
		.split('-')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join('');
}

export function toCamelCase(name: string): string {
	const parts = name.split('-');
	return (
		parts[0] +
		parts
			.slice(1)
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join('')
	);
}
export function toSentenceCase(name: string): string {
	const words = name.split('-');
	return [
		words[0].charAt(0).toUpperCase() + words[0].slice(1),
		...words.slice(1),
	].join(' ');
}
