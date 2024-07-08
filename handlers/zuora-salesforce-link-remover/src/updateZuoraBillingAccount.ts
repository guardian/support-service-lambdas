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
	const zuoraBillingAccountId = parseResponse.data.item.Zuora__External_Id__c;
	console.log('zuoraBillingAccountId:',zuoraBillingAccountId);

	const sfBillingAccountId = parseResponse.data.item.Id;
	console.log('sfBillingAccountId:',sfBillingAccountId);

	const zuoraBillingAccountUpdateResponse: ZuoraSuccessResponse =
		await updateBillingAccountInZuora(zuoraBillingAccountId);
	console.log('zuoraBillingAccountUpdateResponse:',zuoraBillingAccountUpdateResponse);

	return {
		zuoraBillingAccountId,
		sfBillingAccountId,
		...zuoraBillingAccountUpdateResponse,
	};
};

const DataSchema = z.object({
	Zuora__External_Id__c: z.string(),
	Id: z.string(),
});

const EventSchema = z.object({
	item: DataSchema,
});
export type Event = z.infer<typeof EventSchema>;
