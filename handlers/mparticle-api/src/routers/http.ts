import { createRoute, Router } from '@modules/routing/router';
import type { DataSubjectRequestForm } from '../apis/dataSubjectRequests/submit';
import type { EventBatch } from '../apis/events/uploadAnEventBatch';
import type {
	DataSubjectAPI,
	EventsAPI,
	MParticleClient,
} from '../services/mparticleClient';
import type { DataSubjectRequestCallback } from './http/dataSubjectRequestCallback/data-subject-request-callback';
import {
	dataSubjectRequestCallbackHandler,
	dataSubjectRequestCallbackParser,
} from './http/dataSubjectRequestCallback/data-subject-request-callback';
import {
	getDataSubjectRequestStatusHandler,
	requestIdPathParser,
} from './http/get-data-subject-request-status';
import {
	dataSubjectRequestFormParser,
	submitDataSubjectRequestHandler,
} from './http/submit-data-subject-request';
import {
	eventBatchParser,
	uploadEventBatchHandler,
} from './http/upload-event-batch';

export const httpRouter = (
	mParticleDataSubjectClient: MParticleClient<DataSubjectAPI>,
	mParticleEventsAPIClient: MParticleClient<EventsAPI>,
	isProd: boolean,
) =>
	new Router([
		createRoute<unknown, DataSubjectRequestForm>({
			httpMethod: 'POST',
			path: '/data-subject-requests',
			handler: submitDataSubjectRequestHandler(
				mParticleDataSubjectClient,
				mParticleEventsAPIClient,
				isProd,
			),
			parser: dataSubjectRequestFormParser,
		}),
		createRoute<{ requestId: string }, unknown>({
			httpMethod: 'GET',
			path: '/data-subject-requests/{requestId}',
			handler: getDataSubjectRequestStatusHandler(mParticleDataSubjectClient),
			parser: requestIdPathParser,
		}),
		createRoute<{ requestId: string }, DataSubjectRequestCallback>({
			httpMethod: 'POST',
			path: '/data-subject-requests/{requestId}/callback',
			handler: dataSubjectRequestCallbackHandler(mParticleDataSubjectClient),
			parser: dataSubjectRequestCallbackParser,
		}),
		createRoute<unknown, EventBatch>({
			httpMethod: 'POST',
			path: '/events',
			handler: uploadEventBatchHandler(mParticleEventsAPIClient),
			parser: eventBatchParser,
		}),
	]);
