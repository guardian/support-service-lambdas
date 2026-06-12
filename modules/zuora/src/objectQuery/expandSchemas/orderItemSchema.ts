import z from 'zod';
import type { ObjectQueryFieldRegistry } from '@modules/zuora/objectQuery/queries/types';

export const orderActionItemSchema = z.object({
	/** The reason the order action was taken. */
	changeReason: z.string().nullable(),
});

export const orderItemSchema = {
	/** The unique identifier of the order. */
	id: z.string(),
	/** The unique identifier of the user who created the order. */
	createdById: z.string(),
	/** The date and time when the order was created. */
	createdDate: z.coerce.date(),
	/** The unique identifier of the user who last updated the order. */
	updatedById: z.string(),
	/** The date and time when the order was last updated. */
	updatedDate: z.coerce.date(),
	/** The order number. */
	orderNumber: z.string(),
	/** The date the order was created, in yyyy-mm-dd format. */
	orderDate: z.coerce.date(),
	/** A description of the order. */
	description: z.string().nullable(),
	/** The state of the order. */
	state: z.string(), // maybe it can be an enum?
} as const satisfies ObjectQueryFieldRegistry;
