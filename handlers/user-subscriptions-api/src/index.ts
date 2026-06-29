import { Lazy } from '@modules/lazy';
import { getIfDefined } from '@modules/nullAndUndefined';
import { Router } from '@modules/routing/router';
import { stageFromEnvironment } from '@modules/stage';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { Handler } from 'aws-lambda';
import { MeEndpoint } from './meEndpoint';

const services = new Lazy(loadServices, 'services');

export const handler: Handler = Router([
	{
		httpMethod: 'GET',
		path: '/me',
		handler: async (event) =>
			new MeEndpoint(await services.get()).handle(
				getIfDefined(
					event.headers['x-identity-id'],
					'missing identity id header',
				),
			),
	},
]);

function loadServices() {
	const stage = stageFromEnvironment();
	return ZuoraClient.create(stage);
}
