import type { z } from 'zod';
import { logger } from '@modules/logger/logger';

export type MParticleResponseSchema<RESPONSE> =
	| z.ZodType<RESPONSE>
	| ((body: string, contentType?: string) => RESPONSE);

export type MParticleHttpResponse<RESPONSE> =
	| {
			success: true;
			data: RESPONSE;
			statusCode: number;
	  }
	| {
			success: false;
			error: Error;
	  };

export class MParticleHttpError extends Error {
	readonly statusCode: number;
	readonly statusText: string;

	constructor(statusCode: number, statusText: string) {
		super(`mParticle request failed with status ${statusCode}`);
		this.name = 'MParticleHttpError';
		this.statusCode = statusCode;
		this.statusText = statusText;
		Error.captureStackTrace(this, MParticleHttpError);
	}
}

export class MParticleNetworkError extends Error {
	constructor() {
		super('mParticle request failed at the network layer');
		this.name = 'MParticleNetworkError';
		Error.captureStackTrace(this, MParticleNetworkError);
	}
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * mParticle exposes several APIs, each with its own base URL and credentials.
 * These marker types brand a client so that a client for one API cannot be
 * passed where a client for another is expected.
 */
export interface DataSubjectAPI {
	readonly clientType: 'dataSubject';
}

export interface EventsAPI {
	readonly clientType: 'eventsApi';
}

export interface BulkDeletionAPI {
	readonly clientType: 'bulkDeletion';
}

export type MParticleApi = DataSubjectAPI | EventsAPI | BulkDeletionAPI;

export type MParticleCredentials = {
	key: string;
	secret: string;
};

/**
 * The client as seen by callers. Kept structural so that tests can supply a
 * plain object without standing up the real HTTP client.
 */
export interface MParticleClient<T extends MParticleApi = MParticleApi> {
	readonly clientType: T['clientType'];
	readonly baseURL: string;

	get<RESPONSE>(
		path: string,
		schema: MParticleResponseSchema<RESPONSE>,
	): Promise<MParticleHttpResponse<RESPONSE>>;

	post<REQUEST, RESPONSE>(
		path: string,
		body: REQUEST,
		schema: MParticleResponseSchema<RESPONSE>,
	): Promise<MParticleHttpResponse<RESPONSE>>;

	getStream(path: string): Promise<ReadableStream>;
}

class MParticleHttpClient<
	T extends MParticleApi = MParticleApi,
> implements MParticleClient<T> {
	private readonly authorizationHeader: string;

	constructor(
		readonly clientType: T['clientType'],
		readonly baseURL: string,
		credentials: MParticleCredentials,
		private readonly fetchFn: typeof fetch = fetch,
	) {
		this.authorizationHeader = `Basic ${Buffer.from(`${credentials.key}:${credentials.secret}`).toString('base64')}`;
	}

	async get<RESPONSE>(
		path: string,
		schema: MParticleResponseSchema<RESPONSE>,
	): Promise<MParticleHttpResponse<RESPONSE>> {
		return this.request('GET', path, schema);
	}

	async post<REQUEST, RESPONSE>(
		path: string,
		body: REQUEST,
		schema: MParticleResponseSchema<RESPONSE>,
	): Promise<MParticleHttpResponse<RESPONSE>> {
		return this.request('POST', path, schema, body);
	}

	async request<REQUEST, RESPONSE>(
		method: HttpMethod,
		path: string,
		schema: MParticleResponseSchema<RESPONSE>,
		body?: REQUEST,
	): Promise<MParticleHttpResponse<RESPONSE>> {
		const response = await this.rawHttpRequest(path, method, body);

		let responseText: string;
		try {
			responseText = await response.text();
		} catch {
			return {
				success: false,
				error: new Error('mParticle response body could not be read'),
			};
		}

		try {
			const contentType = getContentType(response);
			const data = isZodSchema(schema)
				? parseJsonResponse(responseText, contentType, schema)
				: schema(responseText, contentType);

			return { success: true, data, statusCode: response.status };
		} catch {
			return {
				success: false,
				error: new Error('mParticle response could not be parsed'),
			};
		}
	}

	async getStream(path: string): Promise<ReadableStream> {
		logger.log('Sending mParticle stream request', {
			endpoint: this.baseURL,
			path,
		});

		const body = (await this.rawHttpRequest(path, 'GET')).body;
		if (!body) {
			throw new Error('no http response body');
		}
		return body;
	}

	async rawHttpRequest(
		path: string,
		method: HttpMethod = 'GET',
		body?: unknown,
		extraHeaders: Record<string, string> = {},
	): Promise<Response> {
		const headers: Record<string, string> = {
			Authorization: this.authorizationHeader,
			...extraHeaders,
		};

		if (body !== undefined) {
			headers['Content-Type'] = 'application/json';
		}

		let response: Response;
		try {
			response = await this.fetchFn(this.urlFor(path), {
				method,
				headers,
				body: body === undefined ? undefined : JSON.stringify(body),
			});
		} catch {
			throw new MParticleNetworkError();
		}

		if (!response.ok) {
			throw new MParticleHttpError(response.status, response.statusText);
		}

		return response;
	}

	private urlFor(path: string): string {
		const baseURL = this.baseURL.replace(/\/+$/, '');
		const normalisedPath = path.replace(/^\/+/, '');
		return normalisedPath ? `${baseURL}/${normalisedPath}` : baseURL;
	}
}

/**
 * Base URLs for each mParticle API. The pod (e.g. `eu1`) identifies the
 * mParticle data centre hosting our workspace.
 * https://docs.mparticle.com/developers/apis/http/#regional-endpoints
 */
export const dataSubjectBaseUrl = (): string =>
	'https://opendsr.mparticle.com/v3';

export const eventsApiBaseUrl = (pod: string): string =>
	`https://s2s.${pod}.mparticle.com/v2`;

export const bulkDeletionBaseUrl = (pod: string): string =>
	`https://s2s.${pod}.mparticle.com`;

export const createDataSubjectClient = (
	credentials: MParticleCredentials,
	fetchFn: typeof fetch = fetch,
): MParticleClient<DataSubjectAPI> =>
	new MParticleHttpClient<DataSubjectAPI>(
		'dataSubject',
		dataSubjectBaseUrl(),
		credentials,
		fetchFn,
	);

export const createEventsApiClient = (
	credentials: MParticleCredentials,
	pod: string,
	fetchFn: typeof fetch = fetch,
): MParticleClient<EventsAPI> =>
	new MParticleHttpClient<EventsAPI>(
		'eventsApi',
		eventsApiBaseUrl(pod),
		credentials,
		fetchFn,
	);

export const createBulkDeletionClient = (
	credentials: MParticleCredentials,
	pod: string,
	fetchFn: typeof fetch = fetch,
): MParticleClient<BulkDeletionAPI> =>
	new MParticleHttpClient<BulkDeletionAPI>(
		'bulkDeletion',
		bulkDeletionBaseUrl(pod),
		credentials,
		fetchFn,
	);

function isZodSchema<RESPONSE>(
	schema: MParticleResponseSchema<RESPONSE>,
): schema is z.ZodType<RESPONSE> {
	return typeof schema === 'object' && 'parse' in schema;
}

function parseJsonResponse<RESPONSE>(
	body: string,
	contentType: string | undefined,
	schema: z.ZodType<RESPONSE>,
): RESPONSE {
	if (contentType !== 'application/json') {
		throw new Error("mParticle response content type wasn't JSON");
	}

	return schema.parse(JSON.parse(body));
}

function getContentType(response: Response): string | undefined {
	const contentType = [...response.headers.entries()].find(
		([name]) => name.toLowerCase() === 'content-type',
	)?.[1];

	return contentType?.split(';', 1)[0]?.trim().toLowerCase();
}
