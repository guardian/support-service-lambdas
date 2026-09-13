import type { SQSEvent, SQSRecord } from 'aws-lambda';
import { logger } from '@modules/logger/logger';
import {
	identityDeletionEventSchema,
	identityDeletionSnsEnvelopeSchema,
} from '../schemas';
import { cleanDeletedIdentity } from '../services';
import type { IdentityDeletionCleanupDependenciesFactory } from '../types';

export async function handleIdentityDeletionEvent(
	event: SQSEvent,
	dependenciesFactory: IdentityDeletionCleanupDependenciesFactory,
): Promise<void> {
	logger.log('Processing Identity deletion cleanup messages', {
		recordCount: event.Records.length,
	});

	for (const record of event.Records) {
		await handleIdentityDeletionRecord(record, dependenciesFactory);
	}

	logger.log('Finished processing Identity deletion cleanup messages');
}

export async function handleIdentityDeletionRecord(
	record: SQSRecord,
	dependenciesFactory: IdentityDeletionCleanupDependenciesFactory,
): Promise<void> {
	const snsEnvelope = identityDeletionSnsEnvelopeSchema.parse(
		JSON.parse(record.body),
	);

	if (snsEnvelope.Type === 'SubscriptionConfirmation') {
		logger.log('Received an SNS subscription confirmation message');
		return;
	}

	const deletionEvent = identityDeletionEventSchema.parse(
		JSON.parse(snsEnvelope.Message),
	);
	const outcome = await cleanDeletedIdentity(
		deletionEvent.userId,
		await dependenciesFactory(),
	);

	logger.log('Completed Identity deletion cleanup', outcome);
}
