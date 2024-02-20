import { type Stage } from '@modules/stage';
import { actionUpdate } from '@modules/zuora/actionUpdate';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { type AccountRow } from './csv';

export const batchUpdateZuoraAccounts = async ({
	stage,
	accountRows,
}: {
	stage: string;
	accountRows: AccountRow[];
}) => {
	const zuoraClient = await ZuoraClient.create(stage as Stage);

	const response = await actionUpdate(
		zuoraClient,
		JSON.stringify({
			objects: accountRows.map((row) => ({
				Id: row.Zuora__Zuora_Id__c,
				CrmId: row.Zuora__Account__c,
				sfContactId__c: row.Contact__c,
			})),
			type: 'Account',
		}),
	);

	return response;
};
