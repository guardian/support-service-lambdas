import type { z } from 'zod';
import type { Handler } from './router';

export function safeJsonParse(
	input: string,
): { success: true; data: unknown } | { success: false; error: SyntaxError } {
	try {
		const data: unknown = JSON.parse(input);
		return { success: true, data };
	} catch (error) {
		if (error instanceof SyntaxError) {
			return { success: false, error };
		}
		throw error;
	}
}

export const withBodyParser =
	<E, TPath extends Record<string, string>, TBody>(
		bodyParser: z.Schema<TBody>,
		handler: Handler<E, TPath, TBody>,
	): Handler<E, TPath, string | null> =>
	async (event: E, path: TPath, unparsedBody: string | null) => {
		if (unparsedBody === null) {
			return {
				statusCode: 400,
				body: JSON.stringify({
					error: 'Missing request body',
				}),
			};
		}
		const jsonObject = safeJsonParse(unparsedBody);
		if (!jsonObject.success) {
			return {
				statusCode: 400,
				body: JSON.stringify({
					error: 'Invalid request body - not json',
					details: jsonObject.error.message,
				}),
			};
		}
		const parsedBody = bodyParser.safeParse(jsonObject.data);
		if (!parsedBody.success) {
			return {
				statusCode: 400,
				body: JSON.stringify({
					error: 'Invalid request body - wrong type',
					details: parsedBody.error.errors,
				}),
			};
		}
		return await handler(event, path, parsedBody.data);
	};

export const withPathParser =
	<E, TPath, TBody>(
		pathParser: z.Schema<TPath>,
		handler: Handler<E, TPath, TBody>,
	): Handler<E, unknown, TBody> =>
	async (event: E, path: unknown, body: TBody) => {
		const parsedPath = pathParser.safeParse(path);
		if (!parsedPath.success) {
			return {
				statusCode: 400,
				body: JSON.stringify({
					error: 'Invalid request path',
					details: parsedPath.error.errors,
				}),
			};
		}
		return await handler(event, parsedPath.data, body);
	};
export const withParsers = <E, TPath, TBody>(
	path: z.Schema<TPath>,
	body: z.Schema<TBody>,
	handler: Handler<E, TPath, TBody>,
): Handler<E, Record<string, string>, string | null> =>
	withBodyParser(body, withPathParser(path, handler));
