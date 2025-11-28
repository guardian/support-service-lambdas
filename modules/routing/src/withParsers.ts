import type { APIGatewayProxyEvent } from 'aws-lambda';
import { z } from 'zod';
import type { Handler } from './router';

export const withBodyParser =
	<TPath, TBody>(
		bodyParser: z.Schema<TBody>,
		handler: Handler<TPath, TBody>,
	): Handler<TPath, string | null> =>
	async (
		event: APIGatewayProxyEvent,
		parsed: { path: TPath; body: string | null },
	) => {
		if (parsed.body === null) {
			return {
				statusCode: 400,
				body: JSON.stringify({
					error: 'Missing request body',
				}),
			};
		}
		let parsedBody;
		try {
			parsedBody = bodyParser.parse(JSON.parse(parsed.body));
		} catch (error) {
			if (error instanceof z.ZodError) {
				return {
					statusCode: 400,
					body: JSON.stringify({
						error: 'Invalid request body',
						details: error.errors,
					}),
				};
			}
			throw error;
		}
		return await handler(event, { path: parsed.path, body: parsedBody });
	};
export const withPathParser =
	<TPath, TBody>(
		pathParser: z.Schema<TPath>,
		handler: Handler<TPath, TBody>,
	): Handler<unknown, TBody> =>
	async (
		event: APIGatewayProxyEvent,
		parsed: { path: unknown; body: TBody },
	) => {
		let parsedPath;
		try {
			parsedPath = pathParser.parse(parsed.path);
		} catch (error) {
			if (error instanceof z.ZodError) {
				return {
					statusCode: 400,
					body: JSON.stringify({
						error: 'Invalid request path',
						details: error.errors,
					}),
				};
			}
			throw error;
		}
		return await handler(event, { path: parsedPath, body: parsed.body });
	};
export const withParsers = <TPath, TBody>(
	parser: {
		path: z.Schema<TPath>;
		body: z.Schema<TBody>;
	},
	handler: Handler<TPath, TBody>,
): Handler<unknown, string | null> =>
	withBodyParser(parser.body, withPathParser(parser.path, handler));
