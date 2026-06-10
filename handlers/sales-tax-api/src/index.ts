import { Lazy } from '@modules/lazy';
import { logger } from '@modules/logger/logger';
import { Router } from '@modules/routing/router';
import { withBodyParser } from '@modules/routing/withParsers';
import { stageFromEnvironment } from '@modules/stage';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { salesTaxRequestEndpoint } from './salesTaxEndpoint';
import { salesTaxRequestSchema } from './schemas';

const stage = stageFromEnvironment();
const lazyZuoraClient = new Lazy(
	async () => await ZuoraClient.create(stage),
	'Create Zuora client',
);

export const handler = Router([
	{
		httpMethod: 'POST',
		path: '/tax-rate',
		handler: withBodyParser(
			salesTaxRequestSchema,
			async (_event, path, body) => {
				logger.log('Received POST /tax-rate request', body);
				return salesTaxRequestEndpoint(await lazyZuoraClient.get(), body);
			},
		),
	},
]);
