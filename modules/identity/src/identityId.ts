import { z } from 'zod';

// if your function takes a branded IdentityId, you can be sure that the compiler will only allow a provably zod-checked value
export type IdentityId = string & { readonly __brand: 'IdentityId' };

export const identityIdSchema = z
	.string()
	.regex(/^[0-9]+$/)
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- need to refine during deserialisation
	.transform((val: string) => val as IdentityId);
