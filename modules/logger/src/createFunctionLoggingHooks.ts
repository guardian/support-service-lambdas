import type { AroundHooks } from './aroundAsync';
import { prettyPrint } from './prettyPrint';

export type LoggableInput = {
	logOnEntryAndExit?: string;
	logOnEntryOnly?: unknown[];
};

type WrapFnHooksOptions<TFn extends (...args: never[]) => Promise<unknown>> = {
	functionName: string | (() => string);
	argsToLoggable: (args: Parameters<TFn>) => LoggableInput;
	responseToLoggable: (result: Awaited<ReturnType<TFn>>) => unknown;
	emitLog: (message: string) => void;
	emitError: (message: string) => void;
};

function toPrefix(functionName: string | (() => string)): string {
	return (
		'TRACE ' +
		(typeof functionName === 'function' ? functionName() : functionName) +
		' '
	);
}

function toShortPrettyArgs(logOnEntryAndExit: string | undefined): string {
	return logOnEntryAndExit === undefined
		? ''
		: ' SHORT_ARGS\n' + logOnEntryAndExit;
}

function toPrettyArgs(loggable: LoggableInput): string {
	const prettyArgsArray = [
		...(loggable.logOnEntryAndExit ? [loggable.logOnEntryAndExit] : []),
		...(loggable.logOnEntryOnly ?? []),
	].map(prettyPrint);

	return ' ARGS\n' + prettyArgsArray.join('\n');
}

function toEntryMessage(loggable: LoggableInput): string {
	const prettyArgs = toPrettyArgs(loggable);
	return `ENTRY${prettyArgs}`;
}

function toExitMessage(
	maybeLogOnExit: string | undefined,
	result: unknown,
): string {
	const shortPrettyArgs = toShortPrettyArgs(maybeLogOnExit);
	const prettyResult = '\nRESULT\n' + prettyPrint(result);
	return `EXIT${shortPrettyArgs}${prettyResult}`;
}

function toErrorMessage(
	maybeLogOnExit: string | undefined,
	error: unknown,
): string {
	const shortPrettyArgs = toShortPrettyArgs(maybeLogOnExit);
	const prettyError = '\nERROR\n' + prettyPrint(error);
	return `ERROR${shortPrettyArgs}${prettyError}`;
}

/**
 * Lets us log the input and output of an async function.
 *
 * To use this, call logger.wrapFn with your parameters.
 *
 * @param options
 */
export function createFunctionLoggingHooks<
	TFn extends (...args: never[]) => Promise<unknown>,
>(options: WrapFnHooksOptions<TFn>): AroundHooks<TFn, string | undefined> {
	const {
		functionName,
		argsToLoggable,
		responseToLoggable,
		emitLog: baseEmitLog,
		emitError: baseEmitError,
	} = options;

	const prefix = toPrefix(functionName);
	const emitLog = (message: string) => {
		baseEmitLog(prefix + message);
	};
	const emitError = (message: string) => {
		baseEmitError(prefix + message);
	};

	return {
		before: (args) => {
			const loggable = argsToLoggable(args);
			emitLog(toEntryMessage(loggable));
			return loggable.logOnEntryAndExit;
		},
		after: (result, maybeLogOnExit) => {
			emitLog(toExitMessage(maybeLogOnExit, responseToLoggable(result)));
		},
		onError: (error, maybeLogOnExit) => {
			emitError(toErrorMessage(maybeLogOnExit, error));
		},
	};
}
