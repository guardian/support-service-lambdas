import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { zuoraSuccessResponseSchema } from '@modules/zuora/zuoraSchemas';
import type { ZuoraSuccessResponse } from '@modules/zuora/zuoraSchemas';

export async function updateBillingAccountInZuora(
	zuoraBillingAccountId: string,
): Promise<ZuoraSuccessResponse> {
	console.log(
		`removing crmId from Billing Account ${zuoraBillingAccountId}...`,
	);

	const zuoraClient = await ZuoraClient.create('CODE');
	const path = `v1/accounts/${zuoraBillingAccountId}`;

	const body = JSON.stringify({
		crmId: '',
	});

	const zuoraBillingAccountUpdateResponse: ZuoraSuccessResponse =
		await zuoraClient.put(path, body, zuoraSuccessResponseSchema);

	return zuoraBillingAccountUpdateResponse;
}
