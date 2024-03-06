import { actionUpdate } from '@modules/zuora/actionUpdate';
import { type ZuoraClient } from '@modules/zuora/zuoraClient';

export type AccountRow = {
	Id: string;
	Zuora__Zuora_Id__c: string;
	Zuora__Account__c: string;
	Contact__c: string;
};

export type AccountRowResult = {
	ZuoraAccountId: string;
	Success: boolean;
	Errors: Array<{ Message: string; Code: string }>;
};

export const batchUpdateZuoraAccounts = async ({
	zuoraClient,
	accountRows,
}: {
	zuoraClient: ZuoraClient;
	accountRows: AccountRow[];
}): Promise<AccountRowResult[]> => {
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

		return response.map((item, index) => ({
			ZuoraAccountId: accountRows[index]?.Zuora__Zuora_Id__c ?? '',
			Success: item.Success,
			Errors: item.Errors ?? [],
		}));
	} catch (error) {
		console.error(error);
		throw error;
		// if (error instanceof ZuoraError && error.code === 429) {
		// 	throw error;
		// }

		// const formattedResponse = accountRows.map((row) => ({
		// 	Id: row.Zuora__Zuora_Id__c,
		// 	Success: false,
		// 	Errors: [{ Message: '', Code: '' }],
		// }));

		// return formattedResponse;
	}
};
