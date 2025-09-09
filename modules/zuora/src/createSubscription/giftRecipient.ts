import { z } from 'zod';

export const titleSchema = z.union([
	z.literal('Mr'),
	z.literal('Mrs'),
	z.literal('Ms'),
	z.literal('Miss'),
	z.literal('Mx'),
	z.literal('Dr'),
	z.literal('Prof'),
	z.literal('Rev'),
]);

export const giftRecipientSchema = z.object({
	title: titleSchema.nullable(),
	firstName: z.string(),
	lastName: z.string(),
	email: z.string().nullable(),
});

export type GiftRecipient = z.infer<typeof giftRecipientSchema>;
