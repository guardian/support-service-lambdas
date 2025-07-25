import { createRoute, Router } from '@modules/routing/router';
import type { DataSubjectRequestCallback } from '../../interfaces/data-subject-request-callback';
import type { DataSubjectRequestForm } from '../../interfaces/data-subject-request-form';
import type { EventBatch } from '../../interfaces/event-batch';
import {
	dataSubjectRequestCallbackHandler,
	dataSubjectRequestCallbackParser,
} from './http/data-subject-request-callback';
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
import { MParticleDataSubjectClient } from '../apis/data-subject-requests';
import { MParticleEventsClient } from '../apis/events';

export const placeholder = '{requestId}';
export const callbackPath = `/data-subject-requests/${placeholder}/callback`;

export function baseUrlForStage(stage: string) {
	return stage === 'PROD'
		? `https://mparticle-api.support.guardianapis.com`
		: `https://mparticle-api-code.support.guardianapis.com`;
}

export const httpRouter = (
	mParticleDataSubjectClient: MParticleDataSubjectClient,
	mParticleEventsClient: MParticleEventsClient,
	httpRouterBaseUrl: string,
) =>
	new Router([
		createRoute<unknown, DataSubjectRequestForm>({
			httpMethod: 'POST',
			path: '/data-subject-requests',
			handler: submitDataSubjectRequestHandler(
				mParticleDataSubjectClient,
				httpRouterBaseUrl,
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
			path: callbackPath,
			handler: dataSubjectRequestCallbackHandler(mParticleDataSubjectClient),
			parser: dataSubjectRequestCallbackParser,
		}),
		createRoute<unknown, EventBatch>({
			httpMethod: 'POST',
			path: '/events',
			handler: uploadEventBatchHandler(mParticleEventsClient),
			parser: eventBatchParser,
		}),
	]);
