import type {
	BuildHandler,
	BuildHandlerArguments,
	BuildHandlerOutput,
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
			): Promise<BuildHandlerOutput<Output>> => {
				const result = await next(args);

				const { output } = result;

				return {
					output,
					response: {},
				};
			};
			return logger.wrapFn(
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
