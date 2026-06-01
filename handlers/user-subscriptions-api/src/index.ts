import { Router } from '@modules/routing/router';
import type { Handler } from 'aws-lambda';
import { handleMeEndpoint } from './meEndpoint';

export const handler: Handler = Router([
	{
		httpMethod: 'GET',
		path: '/me',
		handler: async () => handleMeEndpoint(),
	},
]);
