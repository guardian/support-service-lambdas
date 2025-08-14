import { ZodObject } from 'zod';

export type AsyncFunction<TArgs extends unknown[], TReturn> = (
	...args: TArgs
) => Promise<TReturn>;

export function withLogging<TArgs extends unknown[], TReturn>(
	fn: AsyncFunction<TArgs, TReturn>,
	functionName?: string | (() => string),
	fnAsString?: string, // fn.toString() needed for args on a bound function
	shortArgsNum?: number,
): AsyncFunction<TArgs, TReturn> {
	return async (...args: TArgs): Promise<TReturn> => {
		const name =
			typeof functionName === 'function'
				? functionName()
				: (functionName ?? fn.name);

		const fnString = fnAsString ?? fn.toString();
		const paramMatch = fnString.match(/\(([^)]*)\)/);
		const paramNames = paramMatch?.[1]
			? paramMatch[1]
					.split(',')
					.map((param) => param.trim().split(/[=\s]/)[0]?.trim())
			: [];

		const prettyArgs: Array<[string, unknown]> = args.map((arg, index) => {
			const paramName = paramNames[index] ?? `arg${index}`;
			const value = arg instanceof ZodObject ? '(ZodObject not expanded)' : arg;
			return [paramName, value];
		});
		const shortPrettyArgs = prettyArgs.slice(0, shortArgsNum ?? 1);
		console.log(`TRACE ${name} ENTRY ARGS`, Object.fromEntries(prettyArgs));

		try {
			const result = await fn(...args);
			console.log(
				`TRACE ${name} EXIT SHORT_ARGS`,
				Object.fromEntries(shortPrettyArgs),
				'RESULT',
				result,
			);
			return result;
		} catch (error) {
			console.error(
				`TRACE ${name} ERROR SHORT_ARGS`,
				Object.fromEntries(shortPrettyArgs),
				'ERROR',
				error,
			);
			throw error;
		}
	};
}
