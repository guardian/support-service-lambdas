import type { Handler } from 'aws-lambda';
import { Router } from '@modules/routing/router';
import { withBodyParser } from '@modules/routing/withParsers';
import { paymentFailureCommsExitPath } from '../constants';
import { paymentFailureCommsExitRequestSchema } from '../schemas';
import { paymentFailureCommsExitController } from './paymentFailureCommsExitController';

export const handler: Handler = Router([
	{
		httpMethod: 'POST',
		path: paymentFailureCommsExitPath,
		handler: withBodyParser(
			paymentFailureCommsExitRequestSchema,
			async (_event, _path, body) => paymentFailureCommsExitController(body),
		),
	},
]);
