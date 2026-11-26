import type { SQSRecord } from 'aws-lambda';
import { z } from 'zod';
import { logger } from '@modules/logger/logger';
import type { HandlerEnv } from '@modules/routing/lambdaHandler';
import { SQSHandler } from '@modules/routing/sqsHandler';
import { getSubscription } from '@modules/zuora/subscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { billingDateMessageSchema } from './billingDateMessage';
import type { ProcessorServices } from './processor/processBillingDate';
import {
	processBillingDate,
	reminderSubscriptionSchema,
} from './processor/processBillingDate';

export const configSchema = z.void();

export const handler = SQSHandler(
	configSchema,
	async (record: SQSRecord, services: ProcessorServices) => {
		const message = billingDateMessageSchema.parse(JSON.parse(record.body));
		logger.mutableAddContext(message.subscriptionNumber);
		await processBillingDate(services, message);
	},
	buildServices,
);

async function buildServices({
	stage,
}: HandlerEnv<void>): Promise<ProcessorServices> {
	const zuoraClient = await ZuoraClient.create(stage);
	return {
		getSubscription: (subscriptionNumber) =>
			getSubscription(
				zuoraClient,
				subscriptionNumber,
				reminderSubscriptionSchema,
			),
	};
}
