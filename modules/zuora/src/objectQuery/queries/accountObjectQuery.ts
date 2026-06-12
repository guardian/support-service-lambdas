import { accountItemSchema } from '@modules/zuora/objectQuery/expandSchemas/accountItemSchema';
import { invoiceItemSchema } from '@modules/zuora/objectQuery/expandSchemas/invoiceItemSchema';
import {
	subscriptionItemSchema,
	subscriptionWithRatePlanChargesSchema,
	subscriptionWithRatePlansSchema,
} from '@modules/zuora/objectQuery/expandSchemas/subscriptionItemSchema';
import type {
	ObjectQueryExpandRegistry,
	ObjectQueryQueryableFields,
} from '@modules/zuora/objectQuery/queries/types';
import { z } from 'zod';
import { ObjectQueryBuilder } from '../objectQueryBuilder';

/*
based on the docs at:
https://developer.zuora.com/v1-api-reference/api/object-queries/queryaccounts
 */

export const accountExpandRegistry = {
	subscriptions: {
		subscriptions: z.array(subscriptionItemSchema),
	},
	'subscriptions.rateplans': {
		subscriptions: z.array(subscriptionWithRatePlansSchema),
	},
	'subscriptions.rateplans.rateplancharges': {
		subscriptions: z.array(subscriptionWithRatePlanChargesSchema),
	},
	invoices: { invoices: z.array(invoiceItemSchema) },
} as const satisfies ObjectQueryExpandRegistry;

const accountQueryableFields = [
	'id',
	'updateddate',
	'accountnumber',
	'balance',
	'batch',
	'billcycleday',
	'billtoid',
	'communicationprofileid',
	'crmid',
	'currency',
	'defaultpaymentmethodid',
	'invoicetemplateid',
	'lastinvoicedate',
	'name',
	'parentid',
	'shiptoid',
	'soldtoid',
	'status',
] as const satisfies ObjectQueryQueryableFields;

export const accountObjectQuery = new ObjectQueryBuilder(
	'accounts',
	accountItemSchema,
	accountExpandRegistry,
	accountQueryableFields,
);
