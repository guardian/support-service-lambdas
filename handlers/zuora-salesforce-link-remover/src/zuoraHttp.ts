import { stageFromEnvironment } from '@modules/stage';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { zuoraSuccessSchema } from '@modules/zuora/types/httpResponse';

export async function updateBillingAccountInZuora(
	zuoraBillingAccountId: string,
): Promise<void> {
	console.log(
		`removing crmId from Billing Account ${zuoraBillingAccountId}...`,
	);

	const zuoraClient = await ZuoraClient.create(stageFromEnvironment());
	const path = `v1/accounts/${zuoraBillingAccountId}`;
	const body = JSON.stringify({
		crmId: '',
	});

	await zuoraClient.put(path, body, zuoraSuccessSchema);
	return;
}
