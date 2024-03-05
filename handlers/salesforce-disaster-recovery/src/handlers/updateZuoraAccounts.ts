import { type Stage } from '@modules/stage';
import { ZuoraClient, ZuoraError } from '@modules/zuora/zuoraClient';
import { type AccountRow, batchUpdateZuoraAccounts } from '../services';

export const handler = async (event: { Items: AccountRow[] }) => {
	const rand = Math.random();

	if (rand < 0.5) {
		throw new ZuoraError('too many requests', 429);
	}

	const stage = process.env.STAGE;

	if (!stage) {
		throw new Error('Environment variables not set');
	}

	const zuoraClient = await ZuoraClient.create(stage as Stage);

	const rows = event.Items.filter((item) => item.Zuora__Zuora_Id__c);
	const results = [];

	for (let i = 0; i < rows.length; i += 50) {
		const batch = rows.slice(i, i + 50);

		const { response, error } = await batchUpdateZuoraAccounts({
			zuoraClient,
			accountRows: batch,
		});

		results.push(
			...batch.map((item, index) => ({
				id: item.Zuora__Zuora_Id__c,
				result: response ? response[index] : error,
			})),
		);
	}

	return results;
};
