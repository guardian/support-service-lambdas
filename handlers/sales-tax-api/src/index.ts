import { Lazy } from '@modules/lazy';
import { logger } from '@modules/logger/logger';
import { Router } from '@modules/routing/router';
import { withBodyParser } from '@modules/routing/withParsers';
import { stageFromEnvironment } from '@modules/stage';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { taxRatesRequestSchema } from './schemas';
import { taxRatesEndpoint, zuoraTaxCodesEndpoint } from './taxRatesEndpoint';

const stage = stageFromEnvironment();
const lazyZuoraClient = new Lazy(
	async () => await ZuoraClient.create(stage),
	'Create Zuora client',
);

export const handler = Router([
	{
		httpMethod: 'POST',
		path: '/tax-zuora-codes',
		handler: async () => {
			logger.log('Received POST /tax-zuora-codes request');
			return zuoraTaxCodesEndpoint(await lazyZuoraClient.get());
		},
	},
	{
		httpMethod: 'POST',
		path: '/tax-rates',
		handler: withBodyParser(
			taxRatesRequestSchema,
			async (event, path, body) => {
				logger.log('Received POST /tax-zuora-rates request', body);
				return taxRatesEndpoint(await lazyZuoraClient.get(), body);
			},
		),
	},
	{
		httpMethod: 'POST',
		path: '/tax-rates-test',
		handler: withBodyParser(
			taxRatesRequestSchema,
			async (event, path, body) => {
				logger.log('Received POST /tax-zuora-rates request', body);
				return zuoraTaxCodesEndpoint(await lazyZuoraClient.get());
			},
		),
	},
]);
