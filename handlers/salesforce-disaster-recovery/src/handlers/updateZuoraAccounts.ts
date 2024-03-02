import { type Stage } from '@modules/stage';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { type AccountRow, batchUpdateZuoraAccounts } from '../services';

export const handler = async (event: { Items: AccountRow[] }) => {
	const stage = process.env.STAGE;

	if (!stage) {
		throw new Error('Environment variables not set');
	}

	const zuoraClient = await ZuoraClient.create(stage as Stage);
	const responses = [];

	for (let i = 0; i < event.Items.length; i += 50) {
		const batch = event.Items.slice(i, i + 50);

		const response = await batchUpdateZuoraAccounts({
			zuoraClient,
			accountRows: batch,
		});

		responses.push(batch.map((item) => ({ id: item.Id, response })));
	}

	return responses;
};
