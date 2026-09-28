import { z, type ZodType } from 'zod';
import type { Authorisation, BearerTokenProvider } from '@modules/zuora/auth';
import { RestClient, RestClientError } from '@modules/zuora/restClient';

export type MParticleResponseSchema<RESPONSE> = ZodType<RESPONSE>;

export type MParticleHttpResponse<RESPONSE> =
	| {
			success: true;
			data: RESPONSE;
	  }
	| {
			success: false;
			error: Error;
	  };

export class MParticleHttpError extends Error {
	readonly statusCode: number;

	constructor(statusCode: number) {
		super(`mParticle request failed with status ${statusCode}`);
		this.name = 'MParticleHttpError';
		this.statusCode = statusCode;
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
		schema: ZodType<RESPONSE>,
	): Promise<MParticleHttpResponse<RESPONSE>>;

	post<REQUEST>(
		path: string,
		body: REQUEST,
	): Promise<MParticleHttpResponse<undefined>>;

	getStream(path: string): Promise<ReadableStream>;
}

class MParticleAuthorisationProvider implements BearerTokenProvider {
	private readonly authHeaders: Record<string, string>;

	constructor(
		private readonly baseUrl: string,
		credentials: MParticleCredentials,
	) {
		this.authHeaders = {
			Authorization: `Basic ${Buffer.from(`${credentials.key}:${credentials.secret}`).toString('base64')}`,
		};
	}

	getAuthorisation(): Promise<Authorisation> {
		return Promise.resolve({
			baseUrl: this.baseUrl,
			authHeaders: this.authHeaders,
		});
	}
}

class MParticleRestClient extends RestClient {
	constructor(baseURL: string, credentials: MParticleCredentials) {
		super(new MParticleAuthorisationProvider(baseURL, credentials));
	}
}

class MParticleHttpClient<
	T extends MParticleApi = MParticleApi,
> implements MParticleClient<T> {
	private readonly restClient: MParticleRestClient;

	constructor(
		readonly clientType: T['clientType'],
		readonly baseURL: string,
		credentials: MParticleCredentials,
	) {
		this.restClient = new MParticleRestClient(baseURL, credentials);
	}

	async get<RESPONSE>(
		path: string,
		schema: MParticleResponseSchema<RESPONSE>,
	): Promise<MParticleHttpResponse<RESPONSE>> {
		try {
			const data = await this.restClient.get(path, schema);
			return {
				success: true,
				data,
			};
		} catch (error) {
			return this.handleRequestError(error);
		}
	}

	post<REQUEST, RESPONSE>(
		path: string,
		body: REQUEST,
		schema: ZodType<RESPONSE>,
	): Promise<MParticleHttpResponse<RESPONSE>>;

	post<REQUEST>(
		path: string,
		body: REQUEST,
	): Promise<MParticleHttpResponse<undefined>>;

	async post<REQUEST, RESPONSE>(
		path: string,
		body: REQUEST,
		schema?: ZodType<RESPONSE>,
	): Promise<MParticleHttpResponse<RESPONSE | undefined>> {
		try {
			if (schema === undefined) {
				await this.restClient.post(path, JSON.stringify(body), z.unknown());
				return {
					success: true,
					data: undefined,
				};
			}

			const data = await this.restClient.post(
				path,
				JSON.stringify(body),
				schema,
			);
			return {
				success: true,
				data,
			};
		} catch (error) {
			return this.handleRequestError(error);
		}
	}

	private handleRequestError<RESPONSE>(
		error: unknown,
	): MParticleHttpResponse<RESPONSE> {
		if (error instanceof RestClientError) {
			if (error.status < 200 || error.status >= 300) {
				throw new MParticleHttpError(error.status);
			}
			return {
				success: false,
				error: new Error('mParticle response could not be parsed'),
			};
		}

		throw new MParticleNetworkError();
	}

	async getStream(path: string): Promise<ReadableStream> {
		try {
			return await this.restClient.getStream(path);
		} catch (error) {
			if (error instanceof RestClientError) {
				throw new MParticleHttpError(error.status);
			}

			throw new MParticleNetworkError();
		}
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
): MParticleClient<DataSubjectAPI> =>
	new MParticleHttpClient<DataSubjectAPI>(
		'dataSubject',
		dataSubjectBaseUrl(),
		credentials,
	);

export const createEventsApiClient = (
	credentials: MParticleCredentials,
	pod: string,
): MParticleClient<EventsAPI> =>
	new MParticleHttpClient<EventsAPI>(
		'eventsApi',
		eventsApiBaseUrl(pod),
		credentials,
	);

export const createBulkDeletionClient = (
	credentials: MParticleCredentials,
	pod: string,
): MParticleClient<BulkDeletionAPI> =>
	new MParticleHttpClient<BulkDeletionAPI>(
		'bulkDeletion',
		bulkDeletionBaseUrl(pod),
		credentials,
	);
