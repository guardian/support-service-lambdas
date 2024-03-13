import { checkDefined } from '@modules/nullAndUndefined';
import { type Stage } from '@modules/stage';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { type AccountRow, batchUpdateZuoraAccounts } from '../services';

export const handler = async (event: { Items: AccountRow[] }) => {
	const { Items } = event;

	const stage = checkDefined<string>(
		process.env.STAGE,
		'STAGE environment variable not set',
	);

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

	return results;
};
