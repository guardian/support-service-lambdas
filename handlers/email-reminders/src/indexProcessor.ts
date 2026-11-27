import { z } from 'zod';
import { getCallerInfo } from '@modules/logger/getCallerInfo';
import { logger } from '@modules/logger/logger';
import { LambdaHandlerWithServices } from '@modules/routing/lambdaHandler';
import { getSubscription } from '@modules/zuora/subscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { ProcessorServices } from './processor/processBillingDate';
import {
	processBillingDate,
	reminderSubscriptionSchema,
} from './processor/processBillingDate';
import { processorInputSchema } from './stepData';

// Invoked by the state machine's map state, once per subscription
export const handler = LambdaHandlerWithServices(
	z.void(),
	async (event: unknown, services: ProcessorServices): Promise<void> => {
		const input = processorInputSchema.parse(event);
		logger.mutableAddContext(input.subscriptionNumber);
		const subscription = await services.getSubscription(
			input.subscriptionNumber,
		);
		processBillingDate(subscription, input);
	},
	async ({ stage }): Promise<ProcessorServices> => {
		const zuoraClient = await ZuoraClient.create(stage);
		return {
			getSubscription: (subscriptionNumber) =>
				getSubscription(
					zuoraClient,
					subscriptionNumber,
					reminderSubscriptionSchema,
				),
		};
	},
	getCallerInfo(),
);
