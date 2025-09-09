import { stageFromEnvironment } from '@modules/stage';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { zuoraResponseSchema } from '@modules/zuora/types';
import type { ZuoraResponse } from '@modules/zuora/types';

export async function updateBillingAccountInZuora(
	zuoraBillingAccountId: string,
): Promise<ZuoraResponse> {
	console.log(
		`removing crmId from Billing Account ${zuoraBillingAccountId}...`,
	);

	const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
	const path = `v1/accounts/${zuoraBillingAccountId}`;
	const body = JSON.stringify({
		crmId: '',
	});

	const zuoraBillingAccountUpdateResponse: ZuoraResponse =
		await zuoraClient.put(path, body, zuoraResponseSchema);

	return zuoraBillingAccountUpdateResponse;
}
