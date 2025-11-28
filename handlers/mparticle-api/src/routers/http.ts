import { Router } from '@modules/routing/router';
import { withParsers } from '@modules/routing/withParsers';
import type { BatonS3Writer } from '../services/batonS3Writer';
import type {
	DataSubjectAPI,
	MParticleClient,
} from '../services/mparticleClient';
import {
	dataSubjectRequestCallbackHandler,
	dataSubjectRequestCallbackParser,
} from './http/dataSubjectRequestCallback/data-subject-request-callback';

export const httpRouter = (
	mParticleDataSubjectClient: MParticleClient<DataSubjectAPI>,
	batonS3Writer: BatonS3Writer,
) =>
	Router([
		{
			httpMethod: 'POST',
			path: '/data-subject-requests/{requestId}/callback',
			handler: withParsers(
				dataSubjectRequestCallbackParser,
				dataSubjectRequestCallbackHandler(
					mParticleDataSubjectClient,
					batonS3Writer,
				),
			),
		},
	]);
