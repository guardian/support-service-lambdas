/**
 * Integration test for the cloneAccount function against the CODE Zuora environment.
 *
 * @group integration
 */

import { cloneAccount, deleteAccount } from '@modules/zuora/account';
import { ZuoraClient } from '@modules/zuora/zuoraClient';

describe('cloneAccount integration', () => {
	const sourceAccountId = '8ad08863990ec4e2019918cb4e3569d4';
	let clonedAccountNumber: string | undefined;

	afterEach(async () => {
		if (clonedAccountNumber !== undefined) {
			const zuoraClient = await ZuoraClient.create('CODE');
			await deleteAccount(zuoraClient, clonedAccountNumber);
			clonedAccountNumber = undefined;
		}
	});

	test('clones a Zuora account, creating a new account with the same data', async () => {
		const zuoraClient = await ZuoraClient.create('CODE');

		clonedAccountNumber = await cloneAccount(zuoraClient, sourceAccountId);

		expect(clonedAccountNumber).toBeDefined();
		expect(clonedAccountNumber).not.toBe(sourceAccountId);
		expect(typeof clonedAccountNumber).toBe('string');
	});
});
