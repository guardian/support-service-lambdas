import { Router } from '@modules/routing/router';
import { withBodyParser } from '@modules/routing/withParsers';
import type { Handler } from 'aws-lambda';
import { helloRequestEndpoint, helloRequestSchema } from './helloEndpoint';

export const handler: Handler = Router([
	{
		httpMethod: 'POST',
		path: '/test',
		handler: withBodyParser(helloRequestSchema, async (event, path, body) =>
			helloRequestEndpoint(body),
		),
	},
]);
