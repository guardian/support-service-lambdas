import type { z } from 'zod';

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

export class RestRequestMaker {
	constructor(
		public baseURL: string,
		private headers: Record<string, string>,
	) {}

	async makeRESTRequest<REQ, RESP>(
		path: string,
		method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
		schema: z.ZodType<RESP, z.ZodTypeDef, unknown>,
		body?: REQ,
	) {
		console.log(`REQUEST: ${method} ${path}`, body);
		return this.requestWithoutLogging(path, method, schema, body).then(
			(resp) => {
				if (resp.success) {
					console.log(`RESPONSE: ${method} ${path}`, resp.data);
				} else {
					console.error('RESPONSE: (failed)', resp.error);
				}
				return resp;
			},
		);
	}

	private async requestWithoutLogging<REQ, RESP>(
		path: string,
		method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
		schema: z.ZodType<RESP, z.ZodTypeDef, unknown>,
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

		let responseBody: string | object | undefined = undefined;
		let json = undefined;
		try {
			responseBody = await response.text();
			if (responseBody !== '') {
				json = JSON.parse(responseBody) as object;
			}
			const data = schema.parse(json ?? '');
			return { success: true, data };
		} catch (cause) {
			return {
				success: false,
				error: new Error(
					'could not parse response as JSON: ' + json
						? JSON.stringify(json)
						: responseBody,
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
		const response = await fetch(`${this.baseURL}${path}`, {
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
