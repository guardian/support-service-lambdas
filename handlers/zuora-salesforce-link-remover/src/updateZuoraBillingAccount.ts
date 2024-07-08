import type { ZuoraSuccessResponse } from '@modules/zuora/zuoraSchemas';
import type { Handler } from 'aws-lambda';
import { z } from 'zod';
import { updateBillingAccountInZuora } from './zuoraHttp';

export const handler: Handler = async (event: Event) => {
	const parseResponse = EventSchema.safeParse(event);
	console.log('parseResponse:',parseResponse);
	if (!parseResponse.success) {
		throw new Error(
			`Error parsing billing account id from input: ${JSON.stringify(parseResponse.error.format())}`,
		);
	}

	const billingAccount = parseResponse.data.item;
	console.log('billingAccount:',billingAccount);

	const zuoraBillingAccountUpdateResponse: ZuoraSuccessResponse =
		await updateBillingAccountInZuora(billingAccount.Zuora__External_Id__c);
	console.log('zuoraBillingAccountUpdateResponse:',zuoraBillingAccountUpdateResponse);

	const returnObj = {
		billingAccount,
		...zuoraBillingAccountUpdateResponse,
	};

	console.log('returnObj : ', returnObj);
	return returnObj;
};

const DataSchema = z.object({
	GDPR_Removal_Attempts__c: z.number(),
	Zuora__External_Id__c: z.string(),
	Id: z.string(),
});

const EventSchema = z.object({
	item: DataSchema,
});
export type Event = z.infer<typeof EventSchema>;
