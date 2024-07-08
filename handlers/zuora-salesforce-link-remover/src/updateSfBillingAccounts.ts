import { stageFromEnvironment } from '@modules/stage';
import type { Handler } from 'aws-lambda';
import { z } from 'zod';
import { doSfAuth, updateSfBillingAccounts } from './salesforceHttp';
import type {
	SalesforceUpdateRecord,
	SfApiUserAuth,
	SfConnectedAppAuth,
} from './salesforceHttp';
import { getSalesforceSecretNames, getSecretValue } from './secrets';
import type { ApiUserSecret, ConnectedAppSecret } from './secrets';

export const handler: Handler = async (event: Event) => {
	console.log('event:',event);
	const parseResponse = EventSchema.safeParse(event);
	console.log('parseResponse:',parseResponse);

	if (!parseResponse.success) {
		throw new Error(
			`Error parsing data from input: ${JSON.stringify(parseResponse.error.format())}`,
		);
	}

	const sfBillingAccountIds = parseResponse.data.billingAccountProcessingAttempts.map(record => record.sfBillingAccountId);
	console.log('sfBillingAccountIds:',sfBillingAccountIds)
	const secretNames = getSalesforceSecretNames(stageFromEnvironment());

	const { authUrl, clientId, clientSecret } =
		await getSecretValue<ConnectedAppSecret>(
			secretNames.connectedAppSecretName,
		);

	const { username, password, token } = await getSecretValue<ApiUserSecret>(
		secretNames.apiUserSecretName,
	);

	const sfConnectedAppAuth: SfConnectedAppAuth = { clientId, clientSecret };
	const sfApiUserAuth: SfApiUserAuth = {
		url: authUrl,
		grant_type: 'password',
		username,
		password,
		token,
	};

	const sfAuthResponse = await doSfAuth(sfApiUserAuth, sfConnectedAppAuth);

	//mocked records to update will come from input event. Need to create state machine before we will know the exact format of the object.
	const mockedRecordsToUpdate: SalesforceUpdateRecord[] = [
		{
			id: 'a029E00000OEdL9QAL',
			GDPR_Removal_Attempts__c: 1,
			attributes: {
				type: 'Zuora__CustomerAccount__c',
			},
		},
		{
			id: 'a029E00000OEdMWQA1',
			GDPR_Removal_Attempts__c: 2,
			attributes: {
				type: 'Zuora__CustomerAccount__c',
			},
		},
	];

	const incrementedRecords = incrementRemovalAttempts(mockedRecordsToUpdate);
	const sfUpdateResponse = await updateSfBillingAccounts(
		sfAuthResponse,
		incrementedRecords,
	);

	return sfUpdateResponse;
}

function incrementRemovalAttempts(
	recordsToIncrement: SalesforceUpdateRecord[],
): SalesforceUpdateRecord[] {
	return recordsToIncrement.map((record) => ({
		...record,
		GDPR_Removal_Attempts__c: record.GDPR_Removal_Attempts__c + 1,
	}));
}

const DataSchema = z.object({
	zuoraBillingAccountId: z.string(),
	sfBillingAccountId: z.string(),
	success: z.boolean()
});

const EventSchema = z.object({
	billingAccountProcessingAttempts: z.array(DataSchema)
});
export type Event = z.infer<typeof EventSchema>;
