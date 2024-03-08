import { type Stage } from '@modules/stage';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import {
	type AccountRow,
	type AccountRowWithResult,
	batchUpdateZuoraAccounts,
	updateZuoraAccount,
} from '../services';

export const handler = async (event: {
	Items: AccountRow[];
}): Promise<AccountRowWithResult[]> => {
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
		const response = await updateZuoraAccount({
			zuoraClient,
			accountRow: failedRow,
		});

		results
			.filter(
				(result) => result.Zuora__Zuora_Id__c === response.Zuora__Zuora_Id__c,
			)
			.map(() => ({ ...response }));
	}

	return results;
};
