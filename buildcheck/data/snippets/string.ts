import type { ZodTypeAny } from 'zod';
import { z } from 'zod';

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

export const booleanFlag = (defaultValue: boolean | null) =>
	z
		.string()
		.toLowerCase()
		.pipe(
			z.enum([
				'y',
				'yes',
				'true',
				'n',
				'no',
				'false',
				...(defaultValue === null ? [] : ['']),
			]),
		)
		.transform((v) =>
			['y', 'yes', 'true', ...(defaultValue === true ? [''] : [])].includes(v),
		)
		.describe(defaultValue === null ? 'y/n' : defaultValue ? 'Y' : 'N');

export const kebabCaseSchema = z
	.string()
	.regex(
		/^[a-z][a-z0-9-]+[a-z0-9]$/,
		'Must be kebab-case, at least 3 characters, e.g. my-new-lambda',
	)
	.describe('kebab-case-string');

export function withPrompt<T extends ZodTypeAny>(schema: T, prompt: string): T {
	return schema.describe(prompt + ` (${schema.description})`);
}
