import type { Handler } from 'aws-lambda';
import { Router } from '@modules/routing/router';
import { withBodyParser } from '@modules/routing/withParsers';
import { paymentFailureCommsExitPath } from '../constants';
import { paymentFailureCommsExitRequestSchema } from '../schemas';
import { defaultDeps } from '../services';
import type { RuntimeDeps } from '../types';
import { paymentFailureCommsExitController } from './paymentFailureCommsExitController';

export const buildPaymentFailureCommsExitHandler = (
	deps: RuntimeDeps = defaultDeps,
): Handler =>
	Router([
		{
			httpMethod: 'POST',
			path: paymentFailureCommsExitPath,
			handler: withBodyParser(
				paymentFailureCommsExitRequestSchema,
				async (_event, _path, body) =>
					paymentFailureCommsExitController(body, deps),
			),
		},
	]);

export const handler = buildPaymentFailureCommsExitHandler();
