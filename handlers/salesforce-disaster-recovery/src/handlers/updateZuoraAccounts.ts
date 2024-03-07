import { type Stage } from '@modules/stage';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import {
	type AccountRow,
	batchUpdateZuoraAccounts,
	updateZuoraAccount,
} from '../services';

export const handler = async (event: { Items: AccountRow[] }) => {
	const { Items } = event;

	const stage = process.env.STAGE;

	if (!stage) {
		throw new Error('Environment variables not set');
	}

	const zuoraClient = await ZuoraClient.create(stage as Stage);

	const results = [];

	for (let i = 0; i < Items.length; i += 50) {
		const batch = Items.slice(i, i + 50);

		const response = await batchUpdateZuoraAccounts({
			zuoraClient,
			accountRows: batch,
		});

		results.push(...response);
	}

	const failedRows = results.filter((row) => !row.Success);

	for (let i = 0; i < failedRows.length; i += 1) {
		const response = await updateZuoraAccount();

		results.map((previousResult) => {
			const newResult = response.filter(
				(row) => row.ZuoraAccountId === previousResult.ZuoraAccountId,
			)[0];

			return newResult ?? previousResult;
		});
	}

	return results;
};
