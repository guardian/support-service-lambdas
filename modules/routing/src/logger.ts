import { ZodObject } from 'zod';

export class Logger {
	constructor(private prefix: string[] = []) {}

	public resetContext(): void {
		this.prefix = [];
	}

	public mutableAddContext(value: string): void {
		this.prefix.push(value);
	}

	/* eslint-disable @typescript-eslint/no-explicit-any -- this has to match console.log */
	/* eslint-disable @typescript-eslint/no-unsafe-argument -- this has to match console.log */
	public log(message: any, ...optionalParams: any[]): void {
		console.log(this.getMessage(message), ...optionalParams);
	}

	public error(message?: any, ...optionalParams: any[]): void {
		console.error(this.getMessage(message), ...optionalParams);
	}
	/* eslint-enable @typescript-eslint/no-unsafe-argument */

	getMessage(message: any): string {
		return [...this.prefix, message].join(' ');
	}
	/* eslint-enable @typescript-eslint/no-explicit-any */

	/**
	 * This function wraps an existing function and logs entry and exit together with the values passed in and returned
	 *
	 * @param fn the function to wrap
	 * @param functionName an optional free text string to identify the function called
	 * @param fnAsString if you have to call .bind(this) on your function, pass in function.toString() here to retain parameter names
	 * @param shortArgsNum when the function returns, one argument will be logged again for identification purposes, this overrides that
	 */
	wrapFn<TArgs extends unknown[], TReturn>(
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
				const value =
					arg instanceof ZodObject ? '(ZodObject not expanded)' : arg;
				return [paramName, value];
			});
			const shortPrettyArgs =
				shortArgsNum === 0
					? undefined
					: Object.fromEntries(prettyArgs.slice(0, shortArgsNum ?? 1));
			this.log(`TRACE ${name} ENTRY ARGS`, Object.fromEntries(prettyArgs));

			try {
				const result = await fn(...args);
				this.log(
					`TRACE ${name} EXIT ` +
						(shortPrettyArgs !== undefined ? '' : `SHORT_ARGS`),
					shortPrettyArgs,
					'RESULT',
					result,
				);
				return result;
			} catch (error) {
				this.error(
					`TRACE ${name} ERROR ` +
						(shortPrettyArgs !== undefined ? '' : `SHORT_ARGS`),
					shortPrettyArgs,
					'ERROR',
					error,
				);
				throw error;
			}
		};
	}

	/**
	 * This function wraps an existing function similar to wrapFn, but resets the logger context before each invocation.
	 * Useful for router functions where each request should start with a clean context.
	 *
	 * @param fn the function to wrap
	 * @param functionName an optional free text string to identify the function called
	 * @param fnAsString if you have to call .bind(this) on your function, pass in function.toString() here to retain parameter names
	 * @param shortArgsNum when the function returns, one argument will be logged again for identification purposes, this overrides that
	 */
	wrapRouter<TArgs extends unknown[], TReturn>(
		fn: AsyncFunction<TArgs, TReturn>,
		functionName?: string | (() => string),
		fnAsString?: string,
		shortArgsNum?: number,
	): AsyncFunction<TArgs, TReturn> {
		const wrappedFn = this.wrapFn(fn, functionName, fnAsString, shortArgsNum);

		return async (...args: TArgs): Promise<TReturn> => {
			this.resetContext();
			return wrappedFn(...args);
		};
	}
}

export type AsyncFunction<TArgs extends unknown[], TReturn> = (
	...args: TArgs
) => Promise<TReturn>;
