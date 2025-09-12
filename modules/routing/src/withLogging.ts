import { ZodObject } from 'zod';
import { Logger } from '@modules/routing/logger';

export type AsyncFunction<TArgs extends unknown[], TReturn> = (
	...args: TArgs
) => Promise<TReturn>;

/**
 * This function wraps an existing function and logs entry and exit together with the values passed in and returned
 *
 * @param fn the function to wrap
 * @param functionName an optional free text string to identify the function called
 * @param fnAsString if you have to call .bind(this) on your function, pass in function.toString() here to retain parameter names
 * @param shortArgsNum when the function returns, one argument will be logged again for identification purposes, this overrides that
 * @param logger if you are using a context logger to prefix the sub id on every line, pass it in here
 */
export function withLogging<TArgs extends unknown[], TReturn>(
	fn: AsyncFunction<TArgs, TReturn>,
	functionName?: string | (() => string),
	fnAsString?: string, // fn.toString() needed for args on a bound function
	shortArgsNum?: number,
	logger: Logger = new Logger(),
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
		logger.log(`TRACE ${name} ENTRY ARGS`, Object.fromEntries(prettyArgs));

		try {
			const result = await fn(...args);
			logger.log(
				`TRACE ${name} EXIT SHORT_ARGS`,
				Object.fromEntries(shortPrettyArgs),
				'RESULT',
				result,
			);
			return result;
		} catch (error) {
			logger.error(
				`TRACE ${name} ERROR SHORT_ARGS`,
				Object.fromEntries(shortPrettyArgs),
				'ERROR',
				error,
			);
			throw error;
		}
	};
}
