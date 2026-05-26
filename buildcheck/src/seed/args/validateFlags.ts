import type { ZodObject, ZodRawShape, ZodTypeAny } from 'zod';
import { parseDescription, promptForFlags } from './promptForFlags';

export async function validateFlags<O>(
	argsSchema: ZodObject<ZodRawShape, 'strip', ZodTypeAny, O, unknown>,
	commandPrefix: string,
	flags: Record<string, string>,
): Promise<O> {
	const parseResult = argsSchema.safeParse(flags);
	if (parseResult.success) {
		return parseResult.data;
	}

	const shape = argsSchema.shape;
	const schemaProps = Object.entries(shape);

	process.stderr.write(
		`Syntax: ${commandPrefix} ${schemaProps
			.map(([k, v]) => `--${k}=<${parseDescription(v, k).hint}>`)
			.join(' ')}\n\n`,
	);

	// Interactive mode when running in a TTY
	if (process.stdin.isTTY) {
		return await promptForFlags(argsSchema);
	}

	// Non-interactive (CI / piped): show error and exit
	const errors = parseResult.error.errors.map(
		(e) => `  --${e.path.join('.')}: ${e.message}`,
	);
	process.stderr.write(errors.join('\n') + '\n');
	throw new Error('syntax error');
}
