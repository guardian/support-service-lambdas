import type { Handler } from 'aws-lambda';
import { Router } from '@modules/routing/router';
import { stageFromEnvironment } from '@modules/stage';
import { listPromotionsEndpoint } from './listPromotionsEndpoint';

const stage = stageFromEnvironment();

export const handler: Handler = Router([
	{
		httpMethod: 'GET',
		path: '/promotions',
		handler: async () => listPromotionsEndpoint(stage),
	},
]);
