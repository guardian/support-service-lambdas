import { createRoute, Router } from '@modules/routing/router';
import type {
	DataSubjectAPI,
	MParticleClient,
} from '../services/mparticleClient';
import type { DataSubjectRequestCallback } from './http/dataSubjectRequestCallback/data-subject-request-callback';
import {
	dataSubjectRequestCallbackHandler,
	dataSubjectRequestCallbackParser,
} from './http/dataSubjectRequestCallback/data-subject-request-callback';

export const httpRouter = (
	mParticleDataSubjectClient: MParticleClient<DataSubjectAPI>,
) =>
	new Router([
		createRoute<{ requestId: string }, DataSubjectRequestCallback>({
			httpMethod: 'POST',
			path: '/data-subject-requests/{requestId}/callback',
			handler: dataSubjectRequestCallbackHandler(mParticleDataSubjectClient),
			parser: dataSubjectRequestCallbackParser,
		}),
	]);
