import {
	MParticleHttpClient,
	type MParticleHttpResponse,
	type MParticleResponseSchema,
} from '@modules/mparticle/mparticleHttpClient';
import type { AppConfig } from './config';

export interface DataSubjectAPI {
	readonly clientType: 'dataSubject';
}

export interface EventsAPI {
	readonly clientType: 'eventsApi';
}

export interface BulkDeletionAPI {
	readonly clientType: 'bulkDeletion';
}

export interface MParticleClient<
	T extends DataSubjectAPI | EventsAPI | BulkDeletionAPI =
		| DataSubjectAPI
		| EventsAPI
		| BulkDeletionAPI,
> {
	readonly clientType: T['clientType'];
	readonly baseURL: string;

	get<RESP>(
		path: string,
		schema: MParticleResponseSchema<RESP>,
	): Promise<MParticleHttpResponse<RESP>>;

	post<REQ, RESP>(
		path: string,
		body: REQ,
		schema: MParticleResponseSchema<RESP>,
	): Promise<MParticleHttpResponse<RESP>>;

	getStream(path: string): Promise<ReadableStream>;
}

export const MParticleClient = {
	createMParticleDataSubjectClient(
		config: AppConfig['workspace'],
	): MParticleClient<DataSubjectAPI> {
		return new MParticleClientImpl<DataSubjectAPI>(
			'https://opendsr.mparticle.com/v3',
			config.key,
			config.secret,
			'dataSubject',
		);
	},

	createEventsApiClient(
		config: AppConfig['inputPlatform'],
		pod: string,
	): MParticleClient<EventsAPI> {
		return new MParticleClientImpl<EventsAPI>(
			`https://s2s.${pod}.mparticle.com/v2`,
			config.key,
			config.secret,
			'eventsApi',
		);
	},

	createBulkDeletionClient(
		config: AppConfig['workspace'],
		pod: string,
	): MParticleClient<BulkDeletionAPI> {
		return new MParticleClientImpl<BulkDeletionAPI>(
			`https://s2s.${pod}.mparticle.com`,
			config.key,
			config.secret,
			'bulkDeletion',
		);
	},
};

export class MParticleClientImpl<
	T extends DataSubjectAPI | EventsAPI | BulkDeletionAPI =
		| DataSubjectAPI
		| EventsAPI
		| BulkDeletionAPI,
> implements MParticleClient<T> {
	readonly clientType: T['clientType'];

	private readonly rest: MParticleHttpClient;
	constructor(
		readonly baseURL: string,
		key: string,
		secret: string,
		clientType: T['clientType'],
		fetchFn: typeof fetch = fetch,
	) {
		this.clientType = clientType;
		this.rest = new MParticleHttpClient(baseURL, key, secret, fetchFn);
	}

	async get<RESP>(
		path: string,
		schema: MParticleResponseSchema<RESP>,
	): Promise<MParticleHttpResponse<RESP>> {
		return this.rest.get(path, schema);
	}

	async post<REQ, RESP>(
		path: string,
		body: REQ,
		schema: MParticleResponseSchema<RESP>,
	): Promise<MParticleHttpResponse<RESP>> {
		return this.rest.post(path, body, schema);
	}

	async getStream(path: string): Promise<ReadableStream> {
		console.log('GET (stream request) ' + this.rest.baseURL + path);
		const body = (await this.rest.rawHttpRequest(path, 'GET')).body;
		if (!body) {
			throw new Error('no http response body');
		}
		return body;
	}
}
