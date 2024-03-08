import { actionUpdate } from '@modules/zuora/actionUpdate';
import { updateAccount } from '@modules/zuora/updateAccount';
import { type ZuoraClient, ZuoraError } from '@modules/zuora/zuoraClient';

export type AccountRow = {
	Id: string;
	Zuora__Zuora_Id__c: string;
	Zuora__Account__c: string;
	Contact__c: string;
};

type ProcessingResult = {
	Success: boolean;
	Errors: Array<{ Message: string; Code: string }>;
};

export type AccountRowWithResult = AccountRow & ProcessingResult;

export const batchUpdateZuoraAccounts = async ({
	zuoraClient,
	accountRows,
}: {
	zuoraClient: ZuoraClient;
	accountRows: AccountRow[];
}): Promise<AccountRowWithResult[]> => {
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

		return accountRows.map((row, index) => ({
			...row,
			Success: response[index]?.Success ?? false,
			Errors: response[index]?.Errors ?? [],
		}));
	} catch (error) {
		console.error(error);

		if (error instanceof ZuoraError && error.code === 429) {
			throw error;
		}

		return accountRows.map((row) => ({
			...row,
			Success: false,
			Errors: [
				{
					Message:
						error instanceof Error ? error.message : JSON.stringify(error),
					Code: error instanceof ZuoraError ? `${error.code}` : 'Unknown Code',
				},
			],
		}));
	}
};

export const updateZuoraAccount = async ({
	zuoraClient,
	accountRow,
}: {
	zuoraClient: ZuoraClient;
	accountRow: AccountRow;
}): Promise<AccountRowWithResult> => {
	try {
		const response = await updateAccount(
			zuoraClient,
			accountRow.Zuora__Zuora_Id__c,
			{
				crmId: accountRow.Zuora__Account__c,
				sfContactId__c: accountRow.Contact__c,
			},
		);

		return {
			...accountRow,
			Success: response.success,
			Errors:
				response.reasons?.map((reason) => ({
					Message: reason.message,
					Code: reason.code,
				})) ?? [],
		};
	} catch (error) {
		console.error(error);

		if (error instanceof ZuoraError && error.code === 429) {
			throw error;
		}

		return {
			...accountRow,
			Success: false,
			Errors: [
				{
					Message:
						error instanceof Error ? error.message : JSON.stringify(error),
					Code: error instanceof ZuoraError ? `${error.code}` : 'Unknown Code',
				},
			],
		};
	}
};
