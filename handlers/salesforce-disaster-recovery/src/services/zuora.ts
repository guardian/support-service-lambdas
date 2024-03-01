import { actionUpdate } from '@modules/zuora/actionUpdate';
import { type ZuoraClient } from '@modules/zuora/zuoraClient';
import { type AccountRow } from './csv';

export const batchUpdateZuoraAccounts = async ({
	zuoraClient,
	accountRows,
}: {
	zuoraClient: ZuoraClient;
	accountRows: AccountRow[];
}) => {
	try {
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

		return { response };
	} catch (error) {
		console.error(error);
		return { error: 'Unexpected error' };
	}
};
