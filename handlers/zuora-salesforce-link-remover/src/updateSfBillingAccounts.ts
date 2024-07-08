import { stageFromEnvironment } from '@modules/stage';
import type { Handler } from 'aws-lambda';
import { BillingAccountRecordsSchema, doSfAuth, updateSfBillingAccounts } from './salesforceHttp';
import type {
	BillingAccountRecord,
	SfApiUserAuth,
	SfConnectedAppAuth,
} from './salesforceHttp';
import { getSalesforceSecretNames, getSecretValue } from './secrets';
import type { ApiUserSecret, ConnectedAppSecret } from './secrets';

export const handler: Handler = async (billingAccounts: BillingAccountRecord[]) => {

	const parseResponse = BillingAccountRecordsSchema.safeParse(billingAccounts);

	if (!parseResponse.success) {
		throw new Error(
			`Error parsing data from input: ${JSON.stringify(parseResponse.error.format())}`,
		);
	}

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
	const billingAccountsToUpdate: BillingAccountRecord[] = incrementRemovalAttempts(parseResponse.data);

	const sfUpdateResponse = await updateSfBillingAccounts(
		sfAuthResponse,
		billingAccountsToUpdate,
	);

	return sfUpdateResponse;
}

function incrementRemovalAttempts(
	recordsToIncrement: BillingAccountRecord[],
): BillingAccountRecord[] {
	return recordsToIncrement.map((record) => ({
		...record,
		GDPR_Removal_Attempts__c: record.GDPR_Removal_Attempts__c + 1,
	}));
}

// const DataSchema = z.object({
//   zuoraBillingAccountId: z.string(),
//   sfBillingAccountId: z.string(),
//   success: z.boolean()
// });

// const EventSchema = z.array(DataSchema);
// export type Event = z.infer<typeof EventSchema>;

// const BillingAccountItemSchema = z.object({
// 	GDPR_Removal_Attempts__c: z.number(),
// 	Zuora__External_Id__c: z.string(),
// 	Id: z.string(),
//   });
  
//   const OriginalRecordSchema = z.object({
// 	billingAccountItem: BillingAccountItemSchema,
// 	success: z.boolean(),
//   });
//   export const OriginalRecordsSchema = z.array(OriginalRecordSchema);
//   export type OriginalRecords = z.infer<typeof OriginalRecordsSchema>;
