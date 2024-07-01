import type { Handler } from 'aws-lambda';
import { z } from 'zod';
import { getSecretValue, getZuoraSecretName } from './secrets';
import type { ZuoraSecret } from './secrets';
import { doZuoraAuth, updateBillingAccountInZuora } from './zuoraHttp';

export const handler: Handler = async (event: Event) => {

	const parseResponse = EventSchema.safeParse(event);

	if (!parseResponse.success) {
		const parseError = `Error parsing billing account id from input: ${JSON.stringify(parseResponse.error.format())}`;
		console.error(parseError);
		throw new Error(parseError);
	}

	const billingAccountId = parseResponse.data.Zuora__External_Id__c;
	
	const stage = process.env.STAGE;
	if (!stage) {
		throw Error('Stage not defined');
	}

	if (!isValidStage(stage)) {
		throw Error('Invalid stage value');
	}
	const secretName = getZuoraSecretName(stage);

	const { clientId, clientSecret } =
		await getSecretValue<ZuoraSecret>(secretName);

	const zuoraAccessToken = await doZuoraAuth({
		client_id: clientId,
		client_secret: clientSecret,
		grant_type: 'client_credentials',
	});

	const zuoraBillingAccountUpdateResponse = await updateBillingAccountInZuora(
		zuoraAccessToken,
		billingAccountId,
	);
	
	return {
		billingAccountId,
		...zuoraBillingAccountUpdateResponse,
	};
};

function isValidStage(value: unknown): value is 'CODE' | 'PROD' {
	return value === 'CODE' || value === 'PROD';
}

const EventSchema = z.object({
	Zuora__External_Id__c: z.string(),
});
export type Event = z.infer<typeof EventSchema>;
