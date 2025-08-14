import { groupMap } from '@modules/arrayFunctions';
import type { z } from 'zod';
import { withLogging } from '../utils/withLogging';

export class HttpError extends Error {
	public statusCode: number;
	public statusText: string;
	public body: unknown;

	constructor(
		message: string,
		statusCode: number,
		statusText: string,
		body: unknown,
	) {
		super(message);
		this.name = 'HttpError';
		this.statusCode = statusCode;
		this.statusText = statusText;
		this.body = body;
		Error.captureStackTrace(this, HttpError);
	}
}

export type HttpResponse<T> =
	| {
			success: true;
			data: T;
	  }
	| {
			success: false;
			error: HttpError | Error;
	  };

export type Schema<RESP> =
	| z.ZodType<RESP, z.ZodTypeDef, unknown>
	| ((body: string, contentType?: string) => RESP);

export class RestRequestMaker {
	constructor(
		public baseURL: string,
		private headers: Record<string, string>,
		private fetch: typeof global.fetch,
	) {}

	makeRESTRequest = withLogging(
		this.restRequestWithoutLogging.bind(this),
		() => 'HTTP ' + this.baseURL,
		this.restRequestWithoutLogging.toString(),
		2,
	);

	private async restRequestWithoutLogging<REQ, RESP>(
		method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
		path: string,
		schema: Schema<RESP>,
		body?: REQ,
	): Promise<HttpResponse<RESP>> {
		const requestHeaders = body
			? { 'Content-Type': 'application/json' }
			: undefined;
		const response = await this.rawHttpRequest(
			path,
			method,
			body,
			requestHeaders,
		);

		const headers: Record<string, string[]> = groupMap(
			[...response.headers.entries()],
			([k]) => k.toLowerCase(),
			([, v]) => v,
		);
		const contentType = headers['content-type']?.[0]?.split('; ')?.[0];

		const responseText = await response.text();
		try {
			if (typeof schema === 'object' && 'parse' in schema) {
				if (contentType !== 'application/json') {
					throw new Error("response content-type wasn't JSON: " + contentType);
				}
				const data = schema.parse(JSON.parse(responseText));
				return { success: true, data };
			} else {
				// schema is a function
				return { success: true, data: schema(responseText, contentType) };
			}
		} catch (cause) {
			return {
				success: false,
				error: new Error(
					'could not parse response: ' +
						responseText +
						' headers: ' +
						JSON.stringify(headers),
					{ cause },
				),
			};
		}
	}

	async rawHttpRequest(
		path: string,
		method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
		body?: unknown,
		headers?: Record<string, string>,
	): Promise<Response> {
		const response = await this.fetch(`${this.baseURL}${path}`, {
			method: method,
			headers: { ...this.headers, ...headers },
			body: body ? JSON.stringify(body) : undefined,
		});

		if (!response.ok) {
			throw new HttpError(
				`HTTP ${response.status}: ${response.statusText}`,
				response.status,
				response.statusText,
				await extractErrorBody(response),
			);
		}
		return response;
	}
}

async function extractErrorBody(response: Response) {
	let errorBody: string | object | undefined;
	try {
		errorBody = await response.text();
		errorBody = JSON.parse(errorBody) as object; // see if we can squeeze json out of it
	} catch {
		/*we tried our best to get something useful*/
	}
	return errorBody;
}
