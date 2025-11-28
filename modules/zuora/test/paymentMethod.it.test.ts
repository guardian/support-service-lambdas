/*
 * @group integration
 */

import { getPaymentMethods } from '@modules/zuora/paymentMethod';
import { ZuoraClient } from '@modules/zuora/zuoraClient';

describe('getPaymentMethods function', () => {
	test('we can retrieve a direct debit mandate from an account id', async () => {
		const accountNumber = 'A00524112';
		const mandateId = 'XPE6XQZ';
		const zuoraClient = await ZuoraClient.create('CODE');
		const response = await getPaymentMethods(zuoraClient, accountNumber);
		const bankTransfer = response.banktransfer?.[0];
		expect(bankTransfer?.mandateInfo.mandateId).toEqual(mandateId);
	});
});
