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
		const zuoraError = error as ZuoraError;
		console.log(zuoraError.code); //429
		console.log(zuoraError.message); //request exceeded limit
		console.log(zuoraError.name); //ZuoraError
		console.log(zuoraError.stack);

		console.log(typeof error);
		console.log('error here');
		console.error(error);
		console.log(JSON.stringify(error));
		// console.log(Object.entries(error))
		return { error: zuoraError };
	}
};
