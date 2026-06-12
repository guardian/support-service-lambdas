import {
	orderActionItemSchema,
	orderItemSchema,
} from '@modules/zuora/objectQuery/expandSchemas/orderItemSchema';
import type {
	ObjectQueryExpandRegistry,
	ObjectQueryQueryableFields,
} from '@modules/zuora/objectQuery/queries/types';
import { z } from 'zod';
import { ObjectQueryBuilder } from '../objectQueryBuilder';

/*
Based on the docs at:
https://developer.zuora.com/v1-api-reference/api/object-queries/queryorders
 */

const ordersExpandRegistry = {
	orderActions: {
		orderActions: z.array(orderActionItemSchema),
	},
} as const satisfies ObjectQueryExpandRegistry;

const ordersQueryableFields = [
	'id',
	'updateddate',
	'orderdate',
	'ordernumber',
	'accountid',
	'status',
	'invoicescheduleid',
] as const satisfies ObjectQueryQueryableFields;

export const ordersObjectQuery = new ObjectQueryBuilder(
	'orders',
	orderItemSchema,
	ordersExpandRegistry,
	ordersQueryableFields,
);
