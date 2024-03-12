import { checkDefined } from '@modules/nullAndUndefined';
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

	const stage = checkDefined<string>(
		process.env.STAGE,
		'STAGE environment variable not set',
	);

	const zuoraClient = await ZuoraClient.create(stage as Stage);

	const batchUpdateResults: AccountRowWithResult[] = [];

	for (let i = 0; i < Items.length; i += 50) {
		const batch = Items.slice(i, i + 50);

		const response = await batchUpdateZuoraAccounts({
			zuoraClient,
			accountRows: batch,
		});

		batchUpdateResults.push(...response);
	}

	const individualUpdateResults: AccountRowWithResult[] = [];

	for (const failedRow of batchUpdateResults.filter((row) => !row.Success)) {
		const response = await updateZuoraAccount({
			zuoraClient,
			accountRow: failedRow,
		});

		individualUpdateResults.push(response);
	}

	const results = batchUpdateResults.map(
		(batchUpdateResult) =>
			individualUpdateResults.find(
				(individualUpdateResult) =>
					individualUpdateResult.Zuora__Zuora_Id__c ===
					batchUpdateResult.Zuora__Zuora_Id__c,
			) ?? batchUpdateResult,
	);

	if (results.find((result) => !result.Success)) {
		throw new Error(
			JSON.stringify(results.filter((result) => !result.Success)),
		);
	}

	return results;
};
