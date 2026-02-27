import * as console from 'node:console';
import { mapOption } from '@modules/nullAndUndefined';
import type {
	BuildHandler,
	BuildHandlerArguments,
	BuildHandlerOutput,
	HandlerExecutionContext,
	MetadataBearer,
	MiddlewareStack,
} from '@smithy/types';
import { getCallerInfo } from '@modules/routing/getCallerInfo';
import { prettyPrint } from '@modules/routing/prettyPrint';

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
					getCallerInfo(),
					`dropContext: context value "${value}" not found`,
				),
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
		this.logFn(this.getMessage(callerInfo, message, ...optionalParams));
	}

	public error(message?: any, ...optionalParams: any[]): void {
		const callerInfo = getCallerInfo();
		this.errorFn(this.getMessage(callerInfo, message, ...optionalParams));
	}

	getMessage(callerInfo: string, ...messages: any[]): string {
		const message = messages.map(prettyPrint).join('\n');
		return this.addPrefixes(callerInfo, message);
	}

	/* eslint-enable @typescript-eslint/no-explicit-any */
	/* eslint-enable @typescript-eslint/no-unsafe-argument */

	private addPrefixes(callerInfo: string, message: string) {
		return [...this.prefix, '[' + callerInfo + ']', message].join(' ');
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
	wrapFn<TArgs extends unknown[], TReturn>(
		fn: AsyncFunction<TArgs, TReturn>,
		functionName: string | (() => string) = fn.name,
		callerInfo: string = getCallerInfo(),
		argsToLoggable: (args: TArgs) => {
			logOnEntryAndExit?: string;
			logOnEntryOnly?: unknown[];
		},
		responseToLoggable: (result: TReturn) => unknown = (result) => result,
	): AsyncFunction<TArgs, TReturn> {
		const prefix =
			'TRACE ' +
			(typeof functionName === 'function' ? functionName() : functionName) +
			' ';

		return async (...args: TArgs): Promise<TReturn> => {
			const { logOnEntryAndExit, logOnEntryOnly } = argsToLoggable(args);

			const prettyArgsArray = [
				...(logOnEntryAndExit ? [logOnEntryAndExit] : []),
				...(logOnEntryOnly ?? []),
			].map(prettyPrint);

			const prettyArgs = ' ARGS\n' + prettyArgsArray.join('\n');
			const shortPrettyArgs =
				logOnEntryAndExit === undefined
					? ''
					: ' SHORT_ARGS\n' + logOnEntryAndExit;

			this.logEntry(callerInfo, prefix, prettyArgs);

			try {
				// actually call the function
				const result = await fn(...args);

				this.logExit(
					responseToLoggable(result),
					prefix,
					shortPrettyArgs,
					callerInfo,
				);

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
		const prettyError = '\nERROR\n' + prettyPrint(error);
		const errorMessage = `${prefix}ERROR${shortPrettyArgs}${prettyError}`;
		this.errorFn(this.addPrefixes(callerInfo, errorMessage));
	}

	private logExit(
		result: unknown,
		prefix: string,
		shortPrettyArgs: string,
		callerInfo: string,
	) {
		const prettyResult = '\nRESULT\n' + prettyPrint(result);
		const exitMessage = `${prefix}EXIT${shortPrettyArgs}${prettyResult}`;
		this.logFn(this.addPrefixes(callerInfo, exitMessage));
	}

	private logEntry(callerInfo: string, prefix: string, prettyArgs: string) {
		this.logFn(this.addPrefixes(callerInfo, `${prefix}ENTRY${prettyArgs}`));
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

	wrapAwsClient<
		Input extends object,
		Output extends MetadataBearer,
		T extends { middlewareStack: MiddlewareStack<Input, Output> },
	>(client: T, callerInfo: string = getCallerInfo()): T {
		client.middlewareStack.add(
			<Input extends object, Output extends MetadataBearer>(
				next: BuildHandler<Input, Output>,
				context: HandlerExecutionContext,
			): BuildHandler<Input, Output> => {
				const wrapAws = async (
					args: BuildHandlerArguments<Input>,
				): Promise<BuildHandlerOutput<Output>> => {
					const result = await next(args);

					const { output } = result;

					return {
						output,
						response: {},
					};
				};
				return this.wrapFn(
					wrapAws,
					'AWS ' + context.clientName + ' ' + context.commandName,
					callerInfo,
					(args) => ({ logOnEntryOnly: [args[0].input] }),
					(result) => result.output.$metadata.httpStatusCode,
				);
			},
			{
				name: 'logRequest',
				step: 'build',
				priority: 'high',
			},
		);

		return client;
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
		this.logFn(this.getMessage(callerInfo, message, map(value)));
		return value;
	}
}

export type AsyncFunction<TArgs extends unknown[], TReturn> = (
	...args: TArgs
) => Promise<TReturn>;

// global mutable logger - only use in single threaded code (e.g. lambdas)
export const logger = new Logger();
