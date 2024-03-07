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

	for (const failedRow of failedRows) {
		const rowInput = Items.filter(
			(item) => item.Zuora__Zuora_Id__c === failedRow.ZuoraAccountId,
		)[0];

		if (!rowInput) {
			throw new Error('test');
		}

		const response = await updateZuoraAccount({
			zuoraClient,
			accountRow: rowInput,
		});

		results.map((previousResult) => {
			const newResult = response.filter(
				(failedRow) =>
					failedRow.ZuoraAccountId === previousResult.ZuoraAccountId,
			)[0];

			return newResult ?? previousResult;
		});
	}

	return results;
};
