import { getCallerInfo } from '@modules/routing/getCallerInfo';
import type { AsyncFunction, LoggableInput } from '@modules/routing/logger';
import { logger } from '@modules/routing/logger';
import type { RequestLogger } from '@modules/routing/requestLogger';
import {
	type RegressionLoggableInput,
	withRegressionTestLogging,
} from '@modules/routing/requestLogger';

/**
 * This function wraps an existing function in logging and regression test logging
 *
 * @param fn the function to wrap
 * @param functionName an optional free text string to identify the function called
 * @param callerInfo
 * @param argsToLoggable
 * @param responseToLoggable
 */
export function wrapFn<TArgs extends unknown[], TReturn>(
	requestLogger: RequestLogger | undefined,
	fn: AsyncFunction<TArgs, TReturn>,
	functionName: string | (() => string) = fn.name,
	callerInfo: string = getCallerInfo(),
	argsToLoggable: (args: TArgs) => LoggableInput & RegressionLoggableInput,
	responseToLoggable: (result: TReturn) => unknown = (result) => result,
): AsyncFunction<TArgs, TReturn> {
	return async (...args: TArgs): Promise<TReturn> => {
		const input = argsToLoggable(args);
		const consoleLogged = logger.wrapFn(
			withRegressionTestLogging(fn, input, requestLogger),
			functionName,
			callerInfo,
			argsToLoggable,
			responseToLoggable,
		);

		return await consoleLogged(...args);
	};
}
