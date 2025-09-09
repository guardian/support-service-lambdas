import { createRoute, Router } from '@modules/routing/router';
import type { BatonS3Writer } from '../services/batonS3Writer';
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
	batonS3Writer: BatonS3Writer,
) =>
	new Router([
		createRoute<{ requestId: string }, DataSubjectRequestCallback>({
			httpMethod: 'POST',
			path: '/data-subject-requests/{requestId}/callback',
			handler: dataSubjectRequestCallbackHandler(
				mParticleDataSubjectClient,
				batonS3Writer,
			),
			parser: dataSubjectRequestCallbackParser,
		}),
	]);
