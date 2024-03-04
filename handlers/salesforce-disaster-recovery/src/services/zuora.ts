import { actionUpdate } from '@modules/zuora/actionUpdate';
import { type ZuoraClient } from '@modules/zuora/zuoraClient';

export interface AccountRow {
	Id: string;
	Zuora__Zuora_Id__c: string;
	Zuora__Account__c: string;
	Contact__c: string;
}

export const batchUpdateZuoraAccounts = async ({
	zuoraClient,
	accountRows,
}: {
	zuoraClient: ZuoraClient;
	accountRows: AccountRow[];
}) => {
	try {
		await actionUpdate(
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
		throw new Error('Test error');

		// return { response };
	} catch (error) {
		console.error(error);
		throw error;
		// return { error: JSON.stringify(error) };
	}
};
