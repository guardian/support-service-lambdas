import { logger } from '@modules/logger/logger';
import { Router } from '@modules/routing/router';
import { withBodyParser } from '@modules/routing/withParsers';
import { salesTaxRequestEndpoint } from './salesTaxEndpoint';
import { salesTaxRequestSchema, taxRatesRequestSchema } from './schemas';
import { taxRatesRequestEndpoint } from './taxRatesEndpoint';

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
	{
		httpMethod: 'POST',
		path: '/tax-rates',
		handler: withBodyParser(
			taxRatesRequestSchema,
			async (event, path, body) => {
				logger.log('Received POST /tax-rates request', body);
				return taxRatesRequestEndpoint(body);
			},
		),
	},
]);
