import { type Stage } from '@modules/stage';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { type AccountRow, batchUpdateZuoraAccounts } from '../services';

export const handler = async (event: { Items: AccountRow[] }) => {
	console.log(event);
	const stage = process.env.STAGE;

	if (!stage) {
		throw new Error('Environment variables not set');
	}

	const zuoraClient = await ZuoraClient.create(stage as Stage);

	for (let i = 0; i < event.Items.length; i += 50) {
		const batch = event.Items.slice(i, i + 50);

		await batchUpdateZuoraAccounts({
			zuoraClient,
			accountRows: batch,
		});
	}
};
