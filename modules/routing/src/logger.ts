import * as console from 'node:console';
import { stageSchema } from '@modules/stage';
import type {
	BuildHandler,
	BuildHandlerArguments,
	BuildHandlerOutput,
	HandlerExecutionContext,
	MetadataBearer,
	MiddlewareStack,
} from '@smithy/types';
import { ZodType } from 'zod';
import { RequestLogger } from '@modules/routing/requestLogger';

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
	private prefix: string[] = [];

	constructor(
		private requestLogger?: RequestLogger,
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
	 * @param type
	 * @param argsToLoggable
	 * @param responseToLoggable
	 * @param argsToSerialisable
	 * @param responseToSerialisable
	 * @param functionName an optional free text string to identify the function called
	 * @param fnString
	 * @param shortArgsNum when the function returns, one argument will be logged again for identification purposes, this overrides that
	 * @param callerInfo
	 * @param resetContext if we should reset the logger context
	 */
	wrapFn<TArgs extends unknown[], TReturn, SerialisedArgs, SerialisedReturn>(
		fn: AsyncFunction<TArgs, TReturn>,
		type: 'AWS' | 'HTTP' | 'HANDLER' | 'COLD_START' | 'FUNCTION' = 'FUNCTION',
		argsToLoggable: (p: {
			args: TArgs;
			paramNames: Array<string | undefined>;
		}) => { args: unknown[]; paramNames: Array<string | undefined> } = (a) => a,
		responseToLoggable: (result: TReturn) => unknown = (a) => a,
		argsToSerialisable:
			| ((args: TArgs) => SerialisedArgs)
			| undefined = undefined,
		responseToSerialisable:
			| ((result: TReturn) => SerialisedReturn)
			| undefined = undefined,
		functionName: string | (() => string) = fn.name,
		fnString: string = fn.toString(), // fn.toString() needed for args on a bound function
		shortArgsNum: number = 1,
		callerInfo: string = this.getCallerInfo(),
		resetContext: boolean | ((args: TArgs) => string) = false,
	): AsyncFunction<TArgs, TReturn> {
		const prefix = `TRACE ${type} ${typeof functionName === 'function' ? functionName() : functionName} `;
		const paramNames = extractParamNames(fnString);

		return async (...args: TArgs): Promise<TReturn> => {
			if (resetContext) {
				this.resetContext();
				if (typeof resetContext === 'function') {
					this.mutableAddContext(resetContext(args));
				}
			}
			const loggable = argsToLoggable({ args, paramNames });
			const prettyArgsArray = this.getPrettyArgs(loggable);

			const prettyArgs =
				' ARGS\n    ' + prettyArgsArray.join('\n').replaceAll('\n', '\n    ');
			const shortPrettyArgs =
				shortArgsNum === 0
					? ''
					: ' SHORT_ARGS\n    ' +
						prettyArgsArray
							.slice(0, shortArgsNum)
							.join('\n')
							.replaceAll('\n', '\n    ');

			this.logEntry(callerInfo, prefix, prettyArgs);

			this.requestLogger?.entry(type);

			try {
				// actually call the function
				const result = await fn(...args);

				this.logExit(
					responseToLoggable(result),
					prefix,
					shortPrettyArgs,
					callerInfo,
				);

				if (argsToSerialisable && responseToSerialisable) {
					// writes to S3 - could throw or be slow
					await this.requestLogger?.exit(
						type,
						argsToSerialisable(args),
						responseToSerialisable(result),
					);
				}

				if (resetContext) {
					this.resetContext();
				}
				return result;
			} catch (error) {
				this.logError(error, prefix, shortPrettyArgs, callerInfo);

				if (argsToSerialisable && responseToSerialisable) {
					// writes to S3 - could throw or be slow
					// should store this differently from normal exit
					await this.requestLogger?.error(
						type,
						argsToSerialisable(args),
						error,
					);
				}

				if (resetContext) {
					this.resetContext();
				}
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
		const prettyError =
			'\nERROR\n    ' + this.prettyPrint(error).replaceAll('\n', '\n    ');
		const errorMessage = `${prefix}ERROR${shortPrettyArgs}${prettyError}`;
		this.errorFn(this.addPrefixes(callerInfo, errorMessage));
	}

	private logExit<TReturn>(
		result: TReturn,
		prefix: string,
		shortPrettyArgs: string,
		callerInfo: string,
	) {
		const prettyResult =
			'\nRESULT\n    ' + this.prettyPrint(result).replaceAll('\n', '\n    ');
		const exitMessage = `${prefix}EXIT${shortPrettyArgs}${prettyResult}`;
		this.logFn(this.addPrefixes(callerInfo, exitMessage));
	}

	private logEntry(callerInfo: string, prefix: string, prettyArgs: string) {
		this.logFn(this.addPrefixes(callerInfo, `${prefix}ENTRY${prettyArgs}`));
	}

	private getPrettyArgs({
		args,
		paramNames,
	}: {
		args: unknown[];
		paramNames: Array<string | undefined>;
	}) {
		return args.map((arg, index) => {
			const paramName = paramNames[index] ?? `arg${index}`;
			const value =
				arg instanceof ZodType
					? '(ZodType not expanded)'
					: this.prettyPrint(arg);
			return `${paramName}: ${value}`;
		});
	}

	// /**
	//  * This function wraps an existing function similar to wrapFn, but resets the logger context before each invocation.
	//  * Useful for router functions where each request should start with a clean context.
	//  *
	//  * @param fn the function to wrap
	//  * @param functionName an optional free text string to identify the function called
	//  * @param fnAsString if you have to call .bind(this) on your function, pass in function.toString() here to retain parameter names
	//  * @param shortArgsNum when the function returns, one argument will be logged again for identification purposes, this overrides that
	//  */
	// wrapRouter<TArgs extends unknown[], TReturn>(
	// 	fn: AsyncFunction<TArgs, TReturn>,
	// 	functionName?: string | (() => string),
	// 	fnAsString?: string,
	// 	shortArgsNum?: number,
	// 	maybeCallerInfo?: string,
	// ): AsyncFunction<TArgs, TReturn> {
	// 	const callerInfo = maybeCallerInfo ?? this.getCallerInfo();
	// 	const wrappedFn = this.wrapFn(
	// 		fn,
	// 		'HANDLER',
	// 		functionName,
	// 		fnAsString,
	// 		shortArgsNum,
	// 		callerInfo,
	// 	);
	//
	// 	return async (...args: TArgs): Promise<TReturn> => {
	// 		this.resetContext();
	// 		return wrappedFn(...args).then((result) => {
	// 			this.resetContext();
	// 			return result;
	// 		});
	// 	};
	// }

	wrapAwsClient<
		Input extends object,
		Output extends MetadataBearer,
		T extends { middlewareStack: MiddlewareStack<Input, Output> },
	>(client: T, callerInfo: string = this.getCallerInfo()): T {
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
					'AWS',
					({ args }) => ({
						args: [args[0].input],
						paramNames: ['input'],
					}),
					(result) => result.output,
					(args) => ({
						clientName: context.clientName,
						commandName: context.commandName,
						input: args[0].input,
					}),
					(result) => result.output,
					(context.clientName ?? 'awsClient') +
						' ' +
						(context.commandName ?? 'operation'),
					undefined,
					0,
					callerInfo,
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
}

export type AsyncFunction<TArgs extends unknown[], TReturn> = (
	...args: TArgs
) => Promise<TReturn>;

function buildSingletonLogger() {
	const parsedStage = stageSchema.safeParse(process.env.STAGE);
	console.log(`buildSingletonLogger in stage ${parsedStage.data}`);
	const requestLogger = parsedStage.success
		? new RequestLogger(parsedStage.data)
		: undefined;
	return new Logger(requestLogger);
}

// global mutable logger - only use in single threaded code (e.g. lambdas)
export const logger: Logger = buildSingletonLogger();
