import * as console from 'node:console';
import { ZodObject } from 'zod';

function extractParamNames(fnString: string) {
	const paramMatch = fnString.match(/\(([^)]*)\)/);
	const paramNames = paramMatch?.[1]
		? paramMatch[1]
				.split(',')
				.map((param) => param.trim().split(/[=\s]/)[0]?.trim())
		: [];
	return paramNames;
}

export class Logger {
	constructor(
		private prefix: string[] = [],

		private logFn = (message: string) => console.log(message),
		private errorFn = (message: string) => console.error(message),
	) {}

	public resetContext(): void {
		this.logFn('logger: resetting context from ' + this.prefix.join(', '));
		this.prefix = [];
	}

	public mutableAddContext(value: string): void {
		this.logFn('logger: adding context ' + value);
		this.prefix.push(value);
	}

	// look at the stack to work out the caller's details
	// be careful about refactoring things that call this as by design it's not referentially transparent
	public getCallerInfo(extraFrames: number = 0): string {
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
		return '';
	}

	/* eslint-disable @typescript-eslint/no-explicit-any -- this has to match console.log */
	/* eslint-disable @typescript-eslint/no-unsafe-argument -- this has to match console.log */
	public log(message: any, ...optionalParams: any[]): void {
		this.logFn(
			this.getMessage(
				this.getCallerInfo(),
				this.joinLines(message, ...optionalParams),
			),
		);
	}

	public error(message?: any, ...optionalParams: any[]): void {
		this.errorFn(
			this.getMessage(
				this.getCallerInfo(),
				this.joinLines(message, ...optionalParams),
			),
		);
	}

	prettyPrint = (value: any): string => {
		if (value === null || value === undefined) {
			return String(value);
		}
		if (value instanceof Error) {
			return value.stack ?? '';
		}
		if (typeof value === 'object' || Array.isArray(value)) {
			try {
				const jsonString = JSON.stringify(value)
					.replace(/"([^"]+)":/g, ' $1: ') // Remove quotes around keys
					.replace(/}$/, ' }');
				if (jsonString.length <= 80) {
					return jsonString;
				}
				return JSON.stringify(value, null, 2).replace(/"([^"]+)":/g, '$1:');
			} catch {
				return String(value);
			}
		}
		return String(value);
	};

	joinLines(...messages: any[]) {
		return messages.map(this.prettyPrint).join('\n');
	}
	/* eslint-enable @typescript-eslint/no-explicit-any */
	/* eslint-enable @typescript-eslint/no-unsafe-argument */

	getMessage(callerInfo: string, message: string): string {
		return [...this.prefix, '[' + callerInfo + ']', message].join(' ');
	}

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
		functionName: string | (() => string) = fn.name,
		fnString: string = fn.toString(), // fn.toString() needed for args on a bound function
		shortArgsNum: number = 1,
		callerInfo: string = this.getCallerInfo(),
	): AsyncFunction<TArgs, TReturn> {
		const prefix =
			'TRACE ' +
			(typeof functionName === 'function' ? functionName() : functionName) +
			' ';
		const paramNames = extractParamNames(fnString);

		return async (...args: TArgs): Promise<TReturn> => {
			const prettyArgsArray = this.getPrettyArgs(paramNames, args);

			const prettyArgs = ' ARGS\n' + prettyArgsArray.join('\n');
			const shortPrettyArgs =
				shortArgsNum === 0
					? ''
					: ' SHORT_ARGS\n' + prettyArgsArray.slice(0, shortArgsNum).join('\n');

			this.logEntry(callerInfo, prefix, prettyArgs);

			try {
				// actually call the function
				const result = await fn(...args);

				this.logExit(result, prefix, shortPrettyArgs, callerInfo);

				return result;
			} catch (error) {
				this.logError(error, prefix, shortPrettyArgs, callerInfo);

				throw error;
			}
		};
	}

	private logError(
		error: unknown,
		prefix: string,
		shortPrettyArgs: string,
		callerInfo: string,
	) {
		const prettyError = '\nERROR\n' + this.prettyPrint(error);
		const errorMessage = `${prefix}ERROR${shortPrettyArgs}${prettyError}`;
		this.errorFn(this.getMessage(callerInfo, errorMessage));
	}

	private logExit<TReturn>(
		result: TReturn,
		prefix: string,
		shortPrettyArgs: string,
		callerInfo: string,
	) {
		const prettyResult = '\nRESULT\n' + this.prettyPrint(result);
		const exitMessage = `${prefix}EXIT${shortPrettyArgs}${prettyResult}`;
		this.logFn(this.getMessage(callerInfo, exitMessage));
	}

	private logEntry(callerInfo: string, prefix: string, prettyArgs: string) {
		this.logFn(this.getMessage(callerInfo, `${prefix}ENTRY${prettyArgs}`));
	}

	private getPrettyArgs<TArgs extends unknown[]>(
		paramNames: Array<string | undefined>,
		args: TArgs,
	) {
		return args.map((arg, index) => {
			const paramName = paramNames[index] ?? `arg${index}`;
			const value =
				arg instanceof ZodObject
					? '(ZodObject not expanded)'
					: this.prettyPrint(arg);
			return `${paramName}: ${value}`;
		});
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
