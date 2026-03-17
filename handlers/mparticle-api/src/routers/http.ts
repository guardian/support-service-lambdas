import { Router } from '@modules/routing/router';
import { withParsers } from '@modules/routing/withParsers';
import type { BatonS3Writer } from '../services/batonS3Writer';
import type {
	DataSubjectAPI,
	EventsAPI,
	MParticleClient,
} from '../services/mparticleClient';
import { ConsentsUpdateHandler } from './http/consentsUpdateHandler';
import {
	dataSubjectRequestCallbackHandler,
	dataSubjectRequestCallbackParser,
} from './http/dataSubjectRequestCallback/data-subject-request-callback';

export const httpRouter = (
	mParticleDataSubjectClient: MParticleClient<DataSubjectAPI>,
	batonS3Writer: BatonS3Writer,
	mParticleClient: MParticleClient<EventsAPI>,
	getNow: () => Date,
) =>
	Router([
		{
			httpMethod: 'POST',
			path: '/data-subject-requests/{requestId}/callback',
			handler: withParsers(
				dataSubjectRequestCallbackParser.path,
				dataSubjectRequestCallbackParser.body,
				dataSubjectRequestCallbackHandler(
					mParticleDataSubjectClient,
					batonS3Writer,
				),
			),
		},
		{
			httpMethod: 'PATCH',
			path: '/consents/{browserId}',
			handler: ConsentsUpdateHandler.handler(mParticleClient, getNow),
		},
	]);
