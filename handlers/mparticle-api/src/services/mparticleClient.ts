import { logger } from '@modules/routing/logger';
import type { AppConfig } from './config';
import type { HttpResponse, Schema } from './make-http-request';
import { RestRequestMaker } from './make-http-request';

export interface DataSubjectAPI {
	readonly clientType: 'dataSubject';
}

export interface EventsAPI {
	readonly clientType: 'eventsApi';
}

export interface MParticleClient<
	T extends DataSubjectAPI | EventsAPI = DataSubjectAPI | EventsAPI,
> {
	readonly clientType: T['clientType'];
	readonly baseURL: string;

	get<RESP>(path: string, schema: Schema<RESP>): Promise<HttpResponse<RESP>>;

	post<REQ, RESP>(
		path: string,
		body: REQ,
		schema: Schema<RESP>,
	): Promise<HttpResponse<RESP>>;

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
};

export class MParticleClientImpl<
	T extends DataSubjectAPI | EventsAPI = DataSubjectAPI | EventsAPI,
> implements MParticleClient<T>
{
	readonly clientType: T['clientType'];

	private readonly rest: RestRequestMaker;
	constructor(
		readonly baseURL: string,
		key: string,
		secret: string,
		clientType: T['clientType'],
	) {
		this.clientType = clientType;
		/**
		 * Authentication
		 * The DSR API is secured via basic authentication. Credentials are issued at the level of an mParticle workspace.
		 * You can obtain credentials for your workspace from the Workspace Settings screen. Note that this authentication
		 * is for a single workspace and scopes the DSR to this workspace only.
		 * https://docs.mparticle.com/developers/apis/dsr-api/v3/#authentication
		 */
		const authHeader = `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`;
		this.rest = new RestRequestMaker(
			baseURL,
			{
				Authorization: authHeader,
			},
			fetch,
		);
	}

	async get<RESP>(
		path: string,
		schema: Schema<RESP>,
	): Promise<HttpResponse<RESP>> {
		return await this.rest.makeRESTRequest(logger.getCallerInfo(1))(
			'GET',
			path,
			schema,
		);
	}

	async post<REQ, RESP>(
		path: string,
		body: REQ,
		schema: Schema<RESP>,
	): Promise<HttpResponse<RESP>> {
		return await this.rest.makeRESTRequest(logger.getCallerInfo(1))(
			'POST',
			path,
			schema,
			body,
		);
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
