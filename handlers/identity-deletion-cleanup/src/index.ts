import { z } from 'zod';
import { SQSHandler } from '@modules/routing/sqsHandler';
import { handleIdentityDeletionRecord } from './handlers/identityDeletionHandler';
import { defaultDependencies } from './services/defaultDependencies';

export const handler = SQSHandler(
	z.object({}),
	handleIdentityDeletionRecord,
	() => ({ dependencies: defaultDependencies() }),
);
