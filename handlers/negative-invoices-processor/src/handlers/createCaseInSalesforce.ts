import { doSfAuth } from '@modules/salesforce/src/auth';
import type {
	SfApiUserAuth,
	SfConnectedAppAuth,
} from '@modules/salesforce/src/auth';
import { getSecretValue } from '@modules/secrets-manager/getSecret';
import { stageFromEnvironment } from '@modules/stage';
import { z } from 'zod';
import { getSalesforceSecretNames } from '../secrets';
import type { ApiUserSecret, ConnectedAppSecret } from '../secrets';
import { PaymentMethodSchema } from '../types';
// import { sfApiVersion } from '@modules/salesforce/src/config';

export const CreateCaseInSalesforceSchema = z.object({
	invoiceId: z.string(),
	accountId: z.string(),
	invoiceNumber: z.string(),
	invoiceBalance: z.number(),
	hasActiveSub: z.boolean(),
	applyCreditToAccountBalanceAttempt: z.object({
		Success: z.boolean(),
	}),
	hasActivePaymentMethod: z.boolean().optional(),
	activePaymentMethods: z.array(PaymentMethodSchema).optional(),
	creditBalanceRefundAttempt: z
		.object({
			Success: z.boolean(),
			paymentMethod: PaymentMethodSchema,
		})
		.optional(),
});

export type CreateCaseInSalesforce = z.infer<
	typeof CreateCaseInSalesforceSchema
>;

export const handler = async (event: CreateCaseInSalesforce) => {
	try {
		const parsedEvent = CreateCaseInSalesforceSchema.parse(event);

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

		console.log('Salesforce Auth Response:', sfAuthResponse);

		return {
			...parsedEvent,
		};
	} catch (error) {
		return {
			...event,
			applyCreditToAccountBalanceStatus: 'Error',
			errorDetail:
				error instanceof Error ? error.message : JSON.stringify(error, null, 2),
		};
	}
};

// interface SalesforceCaseInput {
// 	Subject: string;
// 	Description?: string;
// 	Origin?: string;
// 	Status?: string;
// }

// export async function createSalesforceCase(
// 	caseData: SalesforceCaseInput,
// 	accessToken: string,
// 	instanceUrl: string,
// ): Promise<any> {
// 	const url = `${instanceUrl}/services/data/${sfApiVersion()}/sobjects/Case`;

// 	const response = await fetch(url, {
// 		method: 'POST',
// 		headers: {
// 			Authorization: `Bearer ${accessToken}`,
// 			'Content-Type': 'application/json',
// 		},
// 		body: JSON.stringify(caseData),
// 	});

// 	if (!response.ok) {
// 		const errorBody = await response.json();
// 		throw new Error(
// 			`Error updating billing account in Salesforce: ${JSON.stringify(errorBody)}`,
// 		);
// 	}

// 	return response.json();
// }
