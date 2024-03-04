import { actionUpdate } from '@modules/zuora/actionUpdate';
import { type ZuoraClient, type ZuoraError } from '@modules/zuora/zuoraClient';

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
		const zuoraError = error as ZuoraError;

		if (zuoraError.code === 429) {
			throw error;
		}

		return { error: zuoraError };
	}
};
