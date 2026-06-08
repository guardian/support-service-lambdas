import { logger } from '@modules/logger/logger';
import { Router } from '@modules/routing/router';
import { withBodyParser } from '@modules/routing/withParsers';
import { salesTaxRequestEndpoint } from './salesTaxEndpoint';
import { salesTaxRequestSchema } from './schemas';

export const handler = Router([
	{
		httpMethod: 'POST',
		path: '/tax-rate',
		handler: withBodyParser(
			salesTaxRequestSchema,
			async (event, path, body) => {
				logger.log('Received POST /tax-rate request', body);
				return salesTaxRequestEndpoint(body);
			},
		),
	},
]);
