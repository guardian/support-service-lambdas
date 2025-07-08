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
			error: HttpError;
	  };

export async function makeHttpRequest<T>(
	url: string,
	options: {
		method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
		baseURL?: string;
		headers?: Record<string, string>;
		body?: unknown;
	},
): Promise<HttpResponse<T>> {
	try {
		const response = await fetch(`${options.baseURL}${url}`, {
			method: options.method,
			headers: options.headers,
			body: options.body ? JSON.stringify(options.body) : undefined,
		});

		if (!response.ok) {
			let errorBody;
			try {
				errorBody = await response.json();
			} catch {
				try {
					errorBody = await response.text();
				} catch { }
			}

			return {
				success: false,
				error: new HttpError(
					`HTTP ${response.status}: ${response.statusText}`,
					response.status,
					response.statusText,
					errorBody,
				),
			};
		}

		try {
			const data = (await response.json()) as T;
			return { success: true, data };
		} catch {
			return {
				success: true,
				data: {} as T,
			};
		}
	} catch (err) {
		return {
			success: false,
			error: new HttpError(
				'Network Error',
				0,
				'Network Error',
				err instanceof Error ? err.message : 'Unknown error occurred',
			),
		};
	}
}
