import { ZodObject } from 'zod';

export class Logger {
	constructor(private prefix: string[] = []) {}

	public resetContext(): void {
		console.log('logger: resetting context', this.prefix);
		this.prefix = [];
	}

	public mutableAddContext(value: string): void {
		console.log('logger: adding context', value);
		this.prefix.push(value);
	}

	// look at the stack to work out the caller's details
	// be careful about refactoring things that call this as by design it's not referentially transparent
	public getCallerInfo(extraFrames: number = 0): string | undefined {
		const err = new Error();
		const stack = err.stack?.split('\n');
		// [0] Error, [1] at getCallerInfo, [2] at caller (internal to logger), then [3] actual code
		const callerLine = stack?.[3 + extraFrames] ?? '';
		const match =
			callerLine.match(
				/at\s+([^\s]+)\s+\[as\s+[^\]]+\]\s+\(([^:]+:\d+):\d+\)/,
			) ??
			callerLine.match(/at\s+([^\s]+)\s+\(([^:]+:\d+):\d+\)/) ??
			callerLine.match(/at\s+([^\s]+)\s+\((.*:\d+):\d+\)/) ??
			callerLine.match(/at\s+(.*:\d+):\d+/);
		if (match) {
			const functionName = match[1]?.trim();
			let filename = match[2]?.trim();

			// only take the leaf name (for compactness)
			if (filename?.includes('/')) {
				const lastIndex = filename.lastIndexOf('/');
				filename = filename.substring(lastIndex + '/'.length);
			}

			return filename + (functionName ? '::' + functionName : '');
		}
		return undefined;
	}

	/* eslint-disable @typescript-eslint/no-explicit-any -- this has to match console.log */
	/* eslint-disable @typescript-eslint/no-unsafe-argument -- this has to match console.log */
	public log(message: any, ...optionalParams: any[]): void {
		this.logWithCallerInfo(message, this.getCallerInfo(), ...optionalParams);
	}

	private logWithCallerInfo(
		message: any,
		callerInfo: any,
		...optionalParams: any[]
	): void {
		console.log(this.getMessage(message, callerInfo), ...optionalParams);
	}

	public error(message?: any, ...optionalParams: any[]): void {
		this.errorWithCallerInfo(message, this.getCallerInfo(), ...optionalParams);
	}

	private errorWithCallerInfo(
		message: any,
		callerInfo: any,
		...optionalParams: any[]
	): void {
		console.error(this.getMessage(message, callerInfo), ...optionalParams);
	}
	/* eslint-enable @typescript-eslint/no-unsafe-argument */

	getMessage(message: any, callerInfo: string | undefined): string {
		return [...this.prefix, '[' + callerInfo + ']', message].join(' ');
	}
	/* eslint-enable @typescript-eslint/no-explicit-any */

	/**
	 * This function wraps an existing function and logs entry and exit together with the values passed in and returned
	 *
	 * @param fn the function to wrap
	 * @param functionName an optional free text string to identify the function called
	 * @param fnAsString if you have to call .bind(this) on your function, pass in function.toString() here to retain parameter names
	 * @param shortArgsNum when the function returns, one argument will be logged again for identification purposes, this overrides that
	 * @param maybeCallerInfo
	 */
	wrapFn<TArgs extends unknown[], TReturn>(
		fn: AsyncFunction<TArgs, TReturn>,
		functionName?: string | (() => string),
		fnAsString?: string, // fn.toString() needed for args on a bound function
		shortArgsNum?: number,
		maybeCallerInfo?: string | undefined,
	): AsyncFunction<TArgs, TReturn> {
		const callerInfo = maybeCallerInfo ?? this.getCallerInfo();
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
			this.logWithCallerInfo(
				`TRACE ${name} ENTRY ARGS`,
				callerInfo,
				Object.fromEntries(prettyArgs),
			);

			try {
				const result = await fn(...args);
				this.logWithCallerInfo(
					`TRACE ${name} EXIT ` +
						(shortPrettyArgs !== undefined ? '' : `SHORT_ARGS`),
					callerInfo,
					shortPrettyArgs,
					'RESULT',
					result,
				);
				return result;
			} catch (error) {
				this.errorWithCallerInfo(
					`TRACE ${name} ERROR ` +
						(shortPrettyArgs !== undefined ? '' : `SHORT_ARGS`),
					callerInfo,
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
		maybeCallerInfo?: string,
	): AsyncFunction<TArgs, TReturn> {
		const callerInfo = maybeCallerInfo ?? this.getCallerInfo();
		const wrappedFn = this.wrapFn(
			fn,
			functionName,
			fnAsString,
			shortArgsNum,
			callerInfo,
		);

		return async (...args: TArgs): Promise<TReturn> => {
			this.resetContext();
			return wrappedFn(...args).then((result) => {
				this.resetContext();
				return result;
			});
		};
	}
}

export type AsyncFunction<TArgs extends unknown[], TReturn> = (
	...args: TArgs
) => Promise<TReturn>;

// global mutable logger - only use in single threaded code (e.g. lambdas)
export const logger = new Logger();
