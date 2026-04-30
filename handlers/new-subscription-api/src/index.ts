import { Lazy } from '@modules/lazy';
import { getProductCatalogFromApi } from '@modules/product-catalog/api';
import { logger } from '@modules/routing/logger';
import { Router } from '@modules/routing/router';
import { withBodyParser } from '@modules/routing/withParsers';
import { stageFromEnvironment } from '@modules/stage';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { Handler } from 'aws-lambda';
import { createNewSubscriptionEndpoint } from './createSubscriptionEndpoint';
import type { CreateSubscriptionRequest } from './requestSchema';
import { createSubscriptionRequestSchema } from './requestSchema';

const stage = stageFromEnvironment();
const lazyZuoraClient = new Lazy(
	async () => await ZuoraClient.create(stage),
	'Create Zuora client',
);
const lazyProductCatalog = new Lazy(
	async () => await getProductCatalogFromApi(stage),
	'Get product catalog',
);

// main entry point from AWS
export const handler: Handler = Router([
	{
		httpMethod: 'POST',
		path: '/subscription',
		handler: withBodyParser(
			createSubscriptionRequestSchema,
			async (event, path, body: CreateSubscriptionRequest) => {
				logger.log('Received POST /subscription request', body);
				logger.mutableAddContext(body.identityId);

				return createNewSubscriptionEndpoint(
					stage,
					await lazyZuoraClient.get(),
					await lazyProductCatalog.get(),
					body,
				);
			},
		),
	},
]);
