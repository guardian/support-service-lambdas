import { logger } from '@modules/logger/logger';
import { Router } from '@modules/routing/router';
import { withBodyParser } from '@modules/routing/withParsers';
import type { Handler } from 'aws-lambda';
import { helloRequestEndpoint, helloRequestSchema } from './helloEndpoint';
import {
	salesTaxRequestEndpoint,
	salesTaxRequestSchema,
} from './salesTaxEndpoint';

export const handler: Handler = Router([
	{
		httpMethod: 'POST',
		path: '/hello',
		handler: withBodyParser(helloRequestSchema, async (event, path, body) =>
			helloRequestEndpoint(body),
		),
	},
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
