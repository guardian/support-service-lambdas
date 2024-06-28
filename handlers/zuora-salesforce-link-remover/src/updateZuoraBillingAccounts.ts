import { getSecretValue, getZuoraSecretName } from './secrets';
import type { ZuoraSecret } from './secrets';
import { doZuoraAuth, updateBillingAccountInZuora } from './zuoraHttp';

export async function handler() {
	const stage = process.env.STAGE;
	let zuoraBillingAccountId = process.env.ZUORABILLINGACCOUNTID;

	if (!zuoraBillingAccountId) {
		zuoraBillingAccountId = '2c92c0f875e014d30175e5a18c51068b';
	}
	if (!stage) {
		throw Error('Stage not defined');
	}

	if (!isValidStage(stage)) {
		throw Error('Invalid stage value');
	}

	const input = {
		attributes: {
			type: 'Zuora__CustomerAccount__c',
			url: '/services/data/v54.0/sobjects/Zuora__CustomerAccount__c/a029E00000OEcxWQAT',
		},
		Id: 'a029E00000OEcxWQAT',
		Zuora__Account__c: '0019E00001JW6SLQA1',
		GDPR_Removal_Attempts__c: 0,
		Zuora__External_Id__c: '2c92c0f875e014d30175e5a18c51068b',
	};
	console.log('input:', input);

	const secretName = getZuoraSecretName(stage);

	const { clientId, clientSecret } =
		await getSecretValue<ZuoraSecret>(secretName);

	const zuoraAccessToken = await doZuoraAuth({
		client_id: clientId,
		client_secret: clientSecret,
		grant_type: 'client_credentials',
	});

	await updateBillingAccountInZuora(
		zuoraAccessToken,
		//input.Zuora__External_Id__c
		zuoraBillingAccountId,
	);
	return;
}

function isValidStage(value: unknown): value is 'CODE' | 'PROD' {
	return value === 'CODE' || value === 'PROD';
}
