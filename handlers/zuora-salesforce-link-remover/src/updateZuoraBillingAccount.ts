import type { ZuoraSuccessResponse } from '@modules/zuora/zuoraSchemas';
import type { Handler } from 'aws-lambda';
import { z } from 'zod';
import type { BillingAccountRecord } from './salesforceHttp';
import { updateBillingAccountInZuora } from './zuoraHttp';

export const handler: Handler = async (billingAccount: BillingAccountRecord) => {

	const parseResponse = EventSchema.safeParse(billingAccount);
	if (!parseResponse.success) {
		throw new Error(
			`Error parsing billing account id from input: ${JSON.stringify(parseResponse.error.format())}`,
		);
	}

	const billingAccountItem = parseResponse.data.item;

	const zuoraBillingAccountUpdateResponse: ZuoraSuccessResponse =
		await updateBillingAccountInZuora(billingAccountItem.Zuora__External_Id__c);
	console.log('zuoraBillingAccountUpdateResponse:',zuoraBillingAccountUpdateResponse);

	//todo re-add success value here
	return {
		Id: billingAccountItem.Id,
		GDPR_Removal_Attempts__c: billingAccountItem.GDPR_Removal_Attempts__c,
		Zuora__External_Id__c: billingAccountItem.Zuora__External_Id__c,
		attributes: billingAccountItem.attributes,
	};
};

const DataSchema = z.object({
	GDPR_Removal_Attempts__c: z.number(),
	Zuora__External_Id__c: z.string(),
	Id: z.string(),
	attributes: z.object({
		type: z.string(),
		url: z.string().optional(),
	}),
});

const EventSchema = z.object({
	item: DataSchema,
});
export type Event = z.infer<typeof EventSchema>;
