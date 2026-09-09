import type { Handler } from 'aws-lambda';
import { Router } from '@modules/routing/router';
import { withBodyParser } from '@modules/routing/withParsers';
import {
	paymentFailureCommsExitEndpoint,
	paymentFailureCommsExitRequestSchema,
} from './paymentFailureCommsExitEndpoint';

export const handler: Handler = Router([
	{
		httpMethod: 'POST',
		path: '/exit',
		handler: withBodyParser(
			paymentFailureCommsExitRequestSchema,
			async (_event, _path, body) => paymentFailureCommsExitEndpoint(body),
		),
	},
]);
