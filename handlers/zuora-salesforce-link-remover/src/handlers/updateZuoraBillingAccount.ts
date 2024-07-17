import type { ZuoraSuccessResponse } from '@modules/zuora/zuoraSchemas';
import type { Handler } from 'aws-lambda';
import { z } from 'zod';
import type { BillingAccountRecord, BillingAccountRecordWithSuccess } from '../salesforceHttp';
import { updateBillingAccountInZuora } from '../zuoraHttp';

export const handler: Handler<BillingAccountRecord, BillingAccountRecordWithSuccess> = async (billingAccount) => {

	try{
		const parseResponse = EventSchema.safeParse(billingAccount);
		if (!parseResponse.success) {
			throw new Error(
				`Error parsing billing account id from input: ${JSON.stringify(parseResponse.error.format())}`,
			);
		}

		const billingAccountItem = parseResponse.data.item;

		const zuoraBillingAccountUpdateResponse: ZuoraSuccessResponse =
			await updateBillingAccountInZuora(billingAccountItem.Zuora__External_Id__c);

		return {
			Id: billingAccountItem.Id,
			GDPR_Removal_Attempts__c: billingAccountItem.GDPR_Removal_Attempts__c + 1,
			Zuora__External_Id__c: billingAccountItem.Zuora__External_Id__c,
			attributes: billingAccountItem.attributes,
			crmIdRemovedSuccessfully: zuoraBillingAccountUpdateResponse.success
		};
	}catch(error){
		throw new Error(`Error updating billing accounts in Salesforce: ${JSON.stringify(error)}`);
	}
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
