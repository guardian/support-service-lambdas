import { Lazy } from '@modules/lazy';
import { logger } from '@modules/logger/logger';
import { Router } from '@modules/routing/router';
import { withBodyParser } from '@modules/routing/withParsers';
import { stageFromEnvironment } from '@modules/stage';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { salesTaxRequestEndpoint } from './salesTaxEndpoint';
import { salesTaxRequestSchema, taxRatesRequestSchema } from './schemas';
import {
	taxRatesRequestEndpoint,
	taxRateZuoraRequestEndpoint,
} from './taxRatesEndpoint';

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
	{
		httpMethod: 'POST',
		path: '/tax-zuora-rates',
		handler: withBodyParser(
			taxRatesRequestSchema,
			async (event, path, body) => {
				logger.log('Received POST /tax-zuora-rates request', body);
				return taxRateZuoraRequestEndpoint(await lazyZuoraClient.get(), body);
			},
		),
	},
]);
