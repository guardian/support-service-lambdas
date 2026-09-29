import type { SQSRecord } from 'aws-lambda';
import { logger } from '@modules/logger/logger';
import {
	identityDeletionEventSchema,
	identityDeletionSnsEnvelopeSchema,
} from '../schemas/identityDeletionEventSchema';
import { cleanDeletedIdentity } from '../services/cleanDeletedIdentity';
import type { IdentityDeletionCleanupDependencies } from '../types/identityDeletionCleanup';

type Services = {
	dependencies: Promise<IdentityDeletionCleanupDependencies>;
};

export async function handleIdentityDeletionRecord(
	record: SQSRecord,
	services: Services,
): Promise<void> {
	const snsEnvelope = identityDeletionSnsEnvelopeSchema.parse(
		JSON.parse(record.body),
	);

	const deletionEvent = identityDeletionEventSchema.parse(
		JSON.parse(snsEnvelope.Message),
	);
	const outcome = await cleanDeletedIdentity(
		deletionEvent.userId,
		await services.dependencies,
	);

	logger.log('Completed Identity deletion cleanup', {
		identityId: deletionEvent.userId,
		...outcome,
	});
}
