import * as console from 'node:console';
import { mapOption } from '@modules/nullAndUndefined';
import { aroundAsync } from './aroundAsync';
import {
	createFunctionLoggingHooks,
	type LoggableInput,
} from './createFunctionLoggingHooks';
import { getCallerInfo } from './getCallerInfo';
import { prettyPrint } from './prettyPrint';

export class Logger {
	private prefix: string[] = [];

	constructor(
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
			this.emitLog(getCallerInfo())(
				this.toMessage(`dropContext: context value "${value}" not found`),
			);
		}
	}

	public mutableAddContext(value: string): void {
		this.prefix.push(value);
	}

	/* eslint-disable @typescript-eslint/no-explicit-any -- this has to match console.log */
	/* eslint-disable @typescript-eslint/no-unsafe-argument -- this has to match console.log */
	public log(message: any, ...optionalParams: any[]): void {
		const callerInfo = getCallerInfo();
		this.emitLog(callerInfo)(this.toMessage(message, ...optionalParams));
	}

	public error(message?: any, ...optionalParams: any[]): void {
		const callerInfo = getCallerInfo();
		this.emitError(callerInfo)(this.toMessage(message, ...optionalParams));
	}

	getMessage(callerInfo: string, ...messages: any[]): string {
		return this.addPrefixes(callerInfo, this.toMessage(...messages));
	}

	/* eslint-enable @typescript-eslint/no-explicit-any */
	/* eslint-enable @typescript-eslint/no-unsafe-argument */

	private addPrefixes(callerInfo: string, message: string) {
		return [...this.prefix, '[' + callerInfo + ']', message].join(' ');
	}

	private toMessage(...messages: unknown[]): string {
		return messages.map(prettyPrint).join('\n');
	}

	private emitLog(callerInfo: string): (message: string) => void {
		return (message) => {
			this.logFn(this.addPrefixes(callerInfo, message));
		};
	}

	private emitError(callerInfo: string): (message: string) => void {
		return (message) => {
			this.errorFn(this.addPrefixes(callerInfo, message));
		};
	}

	/**
	 * This function wraps an existing function and logs entry and exit together with the values passed in and returned
	 *
	 * Some functions have a lot passed in/returned that is not useful in the logs - you can
	 * pass in two functions to filter these down more reasonably.
	 *
	 * @param fn the function to wrap
	 * @param functionName an optional free text string to identify the function called
	 * @param callerInfo
	 * @param argsToLoggable
	 * @param responseToLoggable
	 */
	wrapFn<TFn extends (...args: never[]) => Promise<unknown>>(
		fn: TFn,
		functionName: string | (() => string) = fn.name,
		callerInfo: string = getCallerInfo(),
		argsToLoggable: (args: Parameters<TFn>) => LoggableInput,
		responseToLoggable: (result: Awaited<ReturnType<TFn>>) => unknown = (
			result,
		) => result,
	): TFn {
		return aroundAsync(
			fn,
			createFunctionLoggingHooks({
				functionName,
				argsToLoggable,
				responseToLoggable,
				emitLog: this.emitLog(callerInfo),
				emitError: this.emitError(callerInfo),
			}),
		);
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
		const callerInfo = getCallerInfo();
		this.emitLog(callerInfo)(this.toMessage(message, map(value)));
		return value;
	}
}

export type AsyncFunction<TArgs extends unknown[], TReturn> = (
	...args: TArgs
) => Promise<TReturn>;

// global mutable logger - only use in single threaded code (e.g. lambdas)
export const logger = new Logger();
