import { logger } from '@modules/routing/logger';
import { Router } from '@modules/routing/router';
import { withBodyParser } from '@modules/routing/withParsers';
import { stageFromEnvironment } from '@modules/stage';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { Handler } from 'aws-lambda';
import { createNewSubscriptionEndpoint } from './createSubscriptionEndpoint';
import { createSubscriptionRequestSchema } from './requestSchema';

const stage = stageFromEnvironment();

// main entry point from AWS
export const handler: Handler = Router([
	{
		httpMethod: 'POST',
		path: '/subscriptions',
		handler: withBodyParser(
			createSubscriptionRequestSchema,
			async (event, path, body) => {
				logger.log('Received POST /subscriptions request', {
					createdRequestId: body.createdRequestId,
					product: body.productPurchase.product,
					ratePlan: body.productPurchase.ratePlan,
					currency: body.currency,
				});
				logger.mutableAddContext(body.createdRequestId);

				const zuoraClient = await ZuoraClient.create(stage);
				logger.log('Zuora client created for stage', { stage });

				return createNewSubscriptionEndpoint(stage, zuoraClient, body);
			},
		),
	},
]);
