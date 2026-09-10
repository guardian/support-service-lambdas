import type { Handler } from 'aws-lambda';
import { Router } from '@modules/routing/router';
import { withBodyParser } from '@modules/routing/withParsers';
import { paymentFailureCommsExitPath } from '../constants';
import { paymentFailureCommsExitRequestSchema } from '../schemas/paymentFailureCommsExitRequestSchema';
import { defaultDeps } from '../services/defaultDeps';
import type { RuntimeDeps } from '../types/runtimeDeps';
import { paymentFailureCommsExitController } from './paymentFailureCommsExitController';

export const buildPaymentFailureCommsExitHandler = (
	deps: RuntimeDeps,
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

export const handler = buildPaymentFailureCommsExitHandler(defaultDeps);
