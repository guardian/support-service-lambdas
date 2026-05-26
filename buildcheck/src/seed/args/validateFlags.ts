import type { ZodObject, ZodRawShape, ZodTypeAny } from 'zod';

export function validateFlags<O>(
	argsSchema: ZodObject<ZodRawShape, 'strip', ZodTypeAny, O, unknown>,
	commandPrefix: string,
	flags: Record<string, string>,
): O {
	const parseResult = argsSchema.safeParse(flags);
	if (parseResult.success) {
		return parseResult.data;
	}
	const shape = argsSchema.shape;
	const schemaProps = Object.entries(shape);
	const failedKeys = new Set(
		parseResult.error.errors.map((e) => e.path[0]?.toString()),
	);
	const syntax = `Syntax: ${commandPrefix} ${schemaProps
		.map(([k, v]) => `--${k}=<${String(v.description ?? 'value')}>`)
		.join(' ')}`;
	const suggested = `Suggested: ${commandPrefix} ${schemaProps
		.map(([k, v]) => {
			const value =
				k in flags && !failedKeys.has(k)
					? flags[k]
					: `<${String(v.description ?? k)}>`;
			return `--${k}=${value}`;
		})
		.join(' ')}`;
	const errors = parseResult.error.errors.map(
		(e) => `  --${e.path.join('.')}: ${e.message}`,
	);
	process.stderr.write([syntax, suggested, ...errors].join('\n') + '\n');
	throw new Error('syntax error');
}
