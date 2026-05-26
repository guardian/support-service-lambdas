import * as readline from 'readline';
import type { ZodObject, ZodRawShape, ZodTypeAny } from 'zod';

/**
 * Splits a description like "Enter lambda name (kebab-case-string)" into
 * { prompt: "Enter lambda name", hint: "kebab-case-string" }.
 * If no parenthetical suffix, hint equals the full description.
 */
export function parseDescription(
	schema: ZodTypeAny,
	key: string,
): {
	prompt: string;
	hint: string;
	isBooleanField: boolean;
	defaultValue: string | undefined;
} {
	const description = schema.description ?? key;
	const match = /^(.*)\(([^)]+)\)\s*$/.exec(description);
	if (match !== null) {
		const hint = match[2];
		const isBooleanField = hint.toLowerCase() === 'y/n';
		const defaultValue = isBooleanField
			? hint.includes('Y')
				? 'Y'
				: hint.includes('N')
					? 'N'
					: undefined
			: undefined;
		return { prompt: match[1].trimEnd(), hint, isBooleanField, defaultValue };
	}
	return {
		prompt: description,
		hint: description,
		isBooleanField: false,
		defaultValue: undefined,
	};
}

/**
 * Prompts the user interactively for a single field value, re-prompting on
 * validation failure. Returns the raw string the user entered once it passes.
 */
async function promptField(
	rl: readline.Interface,
	key: string,
	schema: ZodTypeAny,
): Promise<string> {
	const { prompt, hint, isBooleanField, defaultValue } = parseDescription(
		schema,
		key,
	);
	const suffix = isBooleanField ? ` (${hint})` : '';

	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- intentional re-prompt loop; exits via return on valid input
	while (true) {
		const raw = await new Promise<string>((resolve) => {
			rl.question(`? ${prompt}${suffix} › ${defaultValue ?? ''}`, resolve);
		});

		const input = raw.trim() === '' && defaultValue ? defaultValue : raw.trim();

		const result = schema.safeParse(input);
		if (result.success) {
			return raw;
		}

		const message = result.error.errors[0]?.message ?? 'Invalid value';
		process.stdout.write(`  ✗ ${message}\n`);
	}
}

/**
 * Interactively prompts for all missing or invalid fields.
 * Returns the fully parsed result via argsSchema.
 */
export async function promptForFlags<O>(
	argsSchema: ZodObject<ZodRawShape, 'strip', ZodTypeAny, O, unknown>,
): Promise<O> {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		terminal: true,
	});

	rl.on('SIGINT', () => {
		process.stdout.write('\n');
		process.exit(130);
	});

	const result: Record<string, string> = {};

	try {
		for (const [key, schema] of Object.entries(argsSchema.shape)) {
			const raw: string = await promptField(rl, key, schema);
			result[key] = raw;
		}
	} finally {
		rl.close();
	}

	return argsSchema.parse(result);
}
