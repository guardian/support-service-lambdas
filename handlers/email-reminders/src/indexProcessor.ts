import type { SQSBatchResponse, SQSEvent } from 'aws-lambda';
import { z } from 'zod';
import { getCallerInfo } from '@modules/logger/getCallerInfo';
import { logger } from '@modules/logger/logger';
import type { HandlerEnv } from '@modules/routing/lambdaHandler';
import { LambdaHandlerWithServices } from '@modules/routing/lambdaHandler';
import { getSubscription } from '@modules/zuora/subscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { billingDateMessageSchema } from './billingDateMessage';
import type { BatchMessage } from './processor/processBatch';
import { processBatch } from './processor/processBatch';
import type { ProcessorServices } from './processor/processBillingDate';
import { reminderSubscriptionSchema } from './processor/processBillingDate';

export const configSchema = z.void();

export const handler = LambdaHandlerWithServices(
	configSchema,
	async (
		event: SQSEvent,
		services: ProcessorServices,
	): Promise<SQSBatchResponse> => {
		const parseFailures: string[] = [];
		const messages: BatchMessage[] = event.Records.flatMap((record) => {
			try {
				const message = billingDateMessageSchema.parse(JSON.parse(record.body));
				return [{ messageId: record.messageId, message }];
			} catch (error) {
				logger.error(`invalid message ${record.messageId}`, error);
				parseFailures.push(record.messageId);
				return [];
			}
		});
		logger.log(`processing ${event.Records.length} messages`);
		const failures = [
			...parseFailures,
			...(await processBatch(services, messages)),
		];
		return {
			batchItemFailures: failures.map((itemIdentifier) => ({
				itemIdentifier,
			})),
		};
	},
	buildServices,
	getCallerInfo(),
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
