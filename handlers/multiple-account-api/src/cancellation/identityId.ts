import { z } from 'zod';

/**
 * Branded identifier for a Guardian Identity user id, scoped to this
 * cancellation-email lambda only (not shared with the rest of
 * `multiple-account-api`, which still passes these around as plain
 * `string`s - see `PLAN-consumer-subscription-events-listener.md` for why a
 * wider refactor was deliberately avoided). Used here purely to stop the
 * primary/secondary identity ids in this module's business logic being
 * accidentally interchanged with other plain `string`s (e.g. email
 * addresses, subscription numbers).
 */
export type IdentityId = string & { readonly __brand: 'IdentityId' };

export const identityIdSchema = z
	.string()
	.regex(/^[0-9]+$/)
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- need to refine during deserialisation
	.transform((val: string) => val as IdentityId);
