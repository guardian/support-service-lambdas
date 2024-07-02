import type { ZuoraSuccessResponse } from '@modules/zuora/zuoraSchemas';
import type { Handler } from 'aws-lambda';
import { z } from 'zod';
import { updateBillingAccountInZuora } from './zuoraHttp';

export const handler: Handler = async (event: Event) => {

	const parseResponse = EventSchema.safeParse(event);

	if (!parseResponse.success) {
		const parseError = `Error parsing billing account id from input: ${JSON.stringify(parseResponse.error.format())}`;
		console.error(parseError);
		throw new Error(parseError);
	}

	const zuoraBillingAccountId = parseResponse.data.Zuora__External_Id__c;
	const zuoraBillingAccountUpdateResponse: ZuoraSuccessResponse = await updateBillingAccountInZuora(zuoraBillingAccountId);
	
	return {
		zuoraBillingAccountId,
		...zuoraBillingAccountUpdateResponse,
	};
};

const EventSchema = z.object({
	Zuora__External_Id__c: z.string(),
});
export type Event = z.infer<typeof EventSchema>;
