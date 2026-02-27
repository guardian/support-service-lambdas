import type {
	BuildHandler,
	BuildHandlerArguments,
	HandlerExecutionContext,
	MetadataBearer,
	MiddlewareStack,
} from '@smithy/types';
import { getCallerInfo } from '@modules/routing/getCallerInfo';
import { logger } from '@modules/routing/logger';

export function wrapAwsClient<
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
			): Promise<Output> => {
				const result = await next(args);
				return result.output;
			};

			return async (inputs) => {
				const output = await logger.wrapFn(
					wrapAws,
					'AWS ' + context.clientName + ' ' + context.commandName,
					callerInfo,
					(args_1) => ({
						logOnEntryOnly: [args_1[0].input],
						regressionTestRequestKey:
							'AWS ' +
							context.clientName +
							' ' +
							context.commandName +
							' ' +
							JSON.stringify(args_1[0].input),
					}),
					(output) => output.$metadata.httpStatusCode,
				)(inputs);
				return { response: {}, output };
			};
		},
		{
			name: 'logRequest',
			step: 'build',
			priority: 'high',
		},
	);

	return client;
}
