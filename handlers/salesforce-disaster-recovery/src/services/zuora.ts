import { actionUpdate } from '@modules/zuora/actionUpdate';
import { type ZuoraClient, ZuoraError } from '@modules/zuora/zuoraClient';

export interface AccountRow {
	Id: string;
	Zuora__Zuora_Id__c: string;
	Zuora__Account__c: string;
	Contact__c: string;
}

export interface BatchUpdateZuoraAccountsResponse {
	zuoraId: string;
	success: boolean;
	result: unknown;
}

export const batchUpdateZuoraAccounts = async ({
	zuoraClient,
	accountRows,
}: {
	zuoraClient: ZuoraClient;
	accountRows: AccountRow[];
}): Promise<BatchUpdateZuoraAccountsResponse[]> => {
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

		const formattedResponse = accountRows.map((row, index) => ({
			zuoraId: row.Zuora__Zuora_Id__c,
			success: response[index]?.Success ?? false,
			result: response[index],
		}));

		return formattedResponse;
	} catch (error) {
		console.error(error);

		if (error instanceof ZuoraError && error.code === 429) {
			throw error;
		}

		const formattedResponse = accountRows.map((row) => ({
			zuoraId: row.Zuora__Zuora_Id__c,
			success: false,
			result: error,
		}));

		return formattedResponse;
	}
};
