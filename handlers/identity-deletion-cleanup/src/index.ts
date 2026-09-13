import type { Handler, SQSEvent } from 'aws-lambda';
import { handleIdentityDeletionEvent } from './handlers/identityDeletionHandler';
import { defaultDependencies } from './services/defaultDependencies';

export const handler: Handler<SQSEvent, void> = async (event): Promise<void> =>
	await handleIdentityDeletionEvent(event, defaultDependencies);
