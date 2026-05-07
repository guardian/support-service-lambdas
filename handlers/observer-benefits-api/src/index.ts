import { logger } from '@modules/routing/logger';
import { Router } from '@modules/routing/router';
import { withBodyParser } from '@modules/routing/withParsers';
import type { Handler } from 'aws-lambda';
import { isActiveEndpoint } from './isActiveEndpoint';
import type { RequestBody } from './schemas';
import { requestSchema } from './schemas';

export const handler: Handler = Router([
	{
		httpMethod: 'POST',
		path: '/is-active',
		handler: withBodyParser(
			requestSchema,
			async (_event, _path, body: RequestBody) => {
				logger.log('Received POST /is-active request', body);
				logger.mutableAddContext(body.subscriptionId);

				return isActiveEndpoint(body);
			},
		),
	},
]);
