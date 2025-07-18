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

export const httpRouter = new Router([
	createRoute<unknown, DataSubjectRequestForm>({
		httpMethod: 'POST',
		path: '/data-subject-requests',
		handler: submitDataSubjectRequestHandler(),
		parser: dataSubjectRequestFormParser,
	}),
	createRoute<{ requestId: string }, unknown>({
		httpMethod: 'GET',
		path: '/data-subject-requests/{requestId}',
		handler: getDataSubjectRequestStatusHandler(),
		parser: requestIdPathParser,
	}),
	createRoute<{ requestId: string }, DataSubjectRequestCallback>({
		httpMethod: 'POST',
		path: '/data-subject-requests/{requestId}/callback',
		handler: dataSubjectRequestCallbackHandler(),
		parser: dataSubjectRequestCallbackParser,
	}),
	createRoute<unknown, EventBatch>({
		httpMethod: 'POST',
		path: '/events',
		handler: uploadEventBatchHandler(),
		parser: eventBatchParser,
	}),
]);
