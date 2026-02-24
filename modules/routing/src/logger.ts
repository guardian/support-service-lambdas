import * as console from 'node:console';
import { mapOption } from '@modules/nullAndUndefined';
import { ZodType } from 'zod';

function extractParamNames(fnString: string) {
	const paramMatch = fnString.match(/\(([^)]*)\)/);
	const paramNames = paramMatch?.[1]
		? paramMatch[1]
				.split(',')
				.map((param) => param.trim().split(/[=\s]/)[0]?.trim())
		: [];
	return paramNames;
}

/**
 * Returns a slice from the right up to and including the first element matching the predicate.
 */
export function takeRightUntil<T>(
	arr: T[],
	predicate: (item: T) => boolean,
): T[] {
	const idx = arr.length - 1 - arr.slice().reverse().findIndex(predicate);
	return idx >= 0 ? arr.slice(idx) : [];
}

export class Logger {
	constructor(
		private prefix: string[] = [],

		private logFn = (message: string) => console.log(message),
		private errorFn = (message: string) => console.error(message),
	) {}

	public resetContext(): void {
		this.prefix = [];
	}

	public dropContext(value: string): void {
		const index = this.prefix.indexOf(value);
		if (index !== -1) {
			this.prefix = this.prefix.slice(0, index);
		} else {
			this.logFn(
				this.getMessage(
					this.getCallerInfo(),
					`dropContext: context value "${value}" not found`,
				),
			);
		}
	}

	public mutableAddContext(value: string): void {
		this.prefix.push(value);
	}

	// look at the stack to work out the caller's details
	// be careful about refactoring things that call this as by design it's not referentially transparent
	public getCallerInfo(
		extraFrames: number = 0,
		stack: string[] | undefined = new Error().stack?.split('\n'),
	): string {
		// [0] Error, [1] at getCallerInfo, [2] at caller (internal to logger), then [3] actual code
		const callerLine = stack?.[3 + extraFrames] ?? '';
		const match =
			callerLine.match(
				/at\s+([^\s]+)\s+\[as\s+[^\]]+\]\s+\(([^:]+):(\d+):\d+\)/,
			) ??
			callerLine.match(/at\s+([^\s]+)\s+\(([^:]+):(\d+):\d+\)/) ??
			callerLine.match(/at\s+([^\s]+)\s+\((.*):(\d+):\d+\)/) ??
			callerLine.match(/at\s+(.*):(\d+):\d+/);
		if (match) {
			const functionName = match[1]?.trim();
			let filename = match[2]?.trim();
			const lineNumber = match[3]?.trim();

			// only take the leaf name (for compactness)
			if (filename?.includes('/')) {
				const pathParts = filename.split('/');
				const commonNames = ['index.ts', 'src'];
				filename = takeRightUntil(
					pathParts,
					(part) => !commonNames.includes(part),
				).join('/');
			}

			return (
				filename + ':' + lineNumber + (functionName ? '::' + functionName : '')
			);
		}
		return '';
	}

	/* eslint-disable @typescript-eslint/no-explicit-any -- this has to match console.log */
	/* eslint-disable @typescript-eslint/no-unsafe-argument -- this has to match console.log */
	public log(message: any, ...optionalParams: any[]): void {
		const callerInfo = this.getCallerInfo();
		this.logFn(this.getMessage(callerInfo, message, ...optionalParams));
	}

	public error(message?: any, ...optionalParams: any[]): void {
		const callerInfo = this.getCallerInfo();
		this.errorFn(this.getMessage(callerInfo, message, ...optionalParams));
	}

	getMessage(callerInfo: string, ...messages: any[]): string {
		const message = messages.map(this.prettyPrint).join('\n');
		return this.addPrefixes(callerInfo, message);
	}

	prettyPrint = (value: any): string => {
		if (value === null || value === undefined) {
			return String(value);
		}
		if (value instanceof Error) {
			return (
				(value.stack ?? '') +
				'\n' +
				this.objectToPrettyString(value) +
				(value.cause ? '\nCaused by: ' + this.prettyPrint(value.cause) : '')
			);
		}
		if (typeof value === 'object' || Array.isArray(value)) {
			return this.objectToPrettyString(value);
		}
		return String(value);
	};

	private objectToPrettyString(object: unknown) {
		try {
			const jsonString = JSON.stringify(object)
				.replace(/"([A-Za-z0-9]+)":/g, ' $1: ') // Remove quotes around keys
				.replace(/}$/, ' }');
			if (jsonString.length <= 80) {
				return jsonString;
			}
			return JSON.stringify(object, null, 2).replace(
				/"([A-Za-z0-9]+)":/g,
				'$1:',
			);
		} catch (e) {
			console.error('caught error when trying to serialise log line', e);
			return String(object);
		}
	}

	/* eslint-enable @typescript-eslint/no-explicit-any */
	/* eslint-enable @typescript-eslint/no-unsafe-argument */

	private addPrefixes(callerInfo: string, message: string) {
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
		this.errorFn(this.addPrefixes(callerInfo, errorMessage));
	}

	private logExit<TReturn>(
		result: TReturn,
		prefix: string,
		shortPrettyArgs: string,
		callerInfo: string,
	) {
		const prettyResult = '\nRESULT\n' + this.prettyPrint(result);
		const exitMessage = `${prefix}EXIT${shortPrettyArgs}${prettyResult}`;
		this.logFn(this.addPrefixes(callerInfo, exitMessage));
	}

	private logEntry(callerInfo: string, prefix: string, prettyArgs: string) {
		this.logFn(this.addPrefixes(callerInfo, `${prefix}ENTRY${prettyArgs}`));
	}

	private getPrettyArgs<TArgs extends unknown[]>(
		paramNames: Array<string | undefined>,
		args: TArgs,
	) {
		return args.map((arg, index) => {
			const paramName = paramNames[index] ?? `arg${index}`;
			const value =
				arg instanceof ZodType
					? '(ZodType not expanded)'
					: this.prettyPrint(arg);
			return `${paramName}: ${value}`;
		});
	}

	/**
	 * This function wraps an existing function but resets the logger context before each invocation.
	 * Useful for router functions where each request should start with a clean context.
	 *
	 * @param fn the function to wrap
	 * @param newContextFromArgs
	 * @param topLevel if it's a top level handler it will reset the context
	 */
	withContext<TArgs extends unknown[], TReturn>(
		fn: AsyncFunction<TArgs, TReturn>,
		newContextFromArgs?: (args: TArgs) => string,
		topLevel?: boolean,
	): AsyncFunction<TArgs, TReturn> {
		return async (...args: TArgs): Promise<TReturn> => {
			if (topLevel) {
				this.resetContext();
			}
			const context = mapOption(newContextFromArgs, (newContextFromArgs) =>
				newContextFromArgs(args),
			);
			if (context !== undefined) {
				this.mutableAddContext(context);
			}
			return fn(...args).finally(() => {
				if (context !== undefined) {
					this.dropContext(context);
				}
				if (topLevel) {
					this.resetContext();
				}
			});
		};
	}

	/**
	 * handy for logging a value on the way past without having to extract a value into a const, log, then return.
	 *
	 * @param message
	 * @param value the value to log and then return
	 * @param map apply before logging if you need to extract a field or spread an iterator
	 */
	tap<T>(message: string, value: T, map: (t: T) => unknown = (t) => t) {
		const callerInfo = this.getCallerInfo();
		this.logFn(this.getMessage(callerInfo, message, map(value)));
		return value;
	}
}

export type AsyncFunction<TArgs extends unknown[], TReturn> = (
	...args: TArgs
) => Promise<TReturn>;

// global mutable logger - only use in single threaded code (e.g. lambdas)
export const logger = new Logger();
