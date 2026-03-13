/**
 * Integration test for the cloneAccount function against the CODE Zuora environment.
 *
 * @group integration
 */

import { cloneAccount, deleteAccount } from '@modules/zuora/account';
import { getPaymentMethods } from '@modules/zuora/paymentMethod';
import type {
	CloneAccountData,
	DefaultPaymentMethodResponse,
} from '@modules/zuora/types';
import { cloneAccountSchema } from '@modules/zuora/types';
import { ZuoraClient } from '@modules/zuora/zuoraClient';

// System-generated basicInfo fields that will differ between source and clone
const BASIC_INFO_EXCLUDE = new Set([
	'id',
	'accountNumber',
	'createdDate',
	'updatedDate',
	'createdBy',
	'updatedBy',
	'parentId',
	'profileId',
	'profileNumber',
]);

// System-generated contact fields that will differ between source and clone
const CONTACT_EXCLUDE = new Set([
	'id',
	'accountId',
	'accountNumber',
	'contactDescription',
	'createdDate',
	'updatedDate',
	'createdBy',
	'updatedBy',
]);

function comparableBasicInfo(
	basicInfo: CloneAccountData['basicInfo'],
): Record<string, unknown> {
	return Object.fromEntries(
		Object.entries(basicInfo).filter(([key]) => !BASIC_INFO_EXCLUDE.has(key)),
	);
}

function comparableContact(
	contact: CloneAccountData['billToContact'],
): Record<string, unknown> {
	return Object.fromEntries(
		Object.entries(contact).filter(([key]) => !CONTACT_EXCLUDE.has(key)),
	);
}

function findDefaultPaymentMethod(
	paymentMethods: DefaultPaymentMethodResponse,
): { type: string } & Record<string, unknown> {
	const { defaultPaymentMethodId } = paymentMethods;
	const pm =
		paymentMethods.creditcardreferencetransaction?.find(
			(p) => p.id === defaultPaymentMethodId,
		) ??
		paymentMethods.creditcard?.find((p) => p.id === defaultPaymentMethodId) ??
		paymentMethods.paypal?.find((p) => p.id === defaultPaymentMethodId) ??
		paymentMethods.banktransfer?.find((p) => p.id === defaultPaymentMethodId);
	if (!pm) {
		throw new Error(
			`Default payment method ${defaultPaymentMethodId} not found in response`,
		);
	}
	return pm;
}

function comparablePaymentMethod(
	pm: { type: string } & Record<string, unknown>,
): Record<string, unknown> {
	switch (pm['type']) {
		case 'CreditCardReferenceTransaction':
			return {
				type: pm['type'],
				tokenId: pm['tokenId'],
				secondTokenId: pm['secondTokenId'],
			};
		case 'CreditCard':
			return {
				type: pm['type'],
				cardNumber: pm['cardNumber'],
				expirationMonth: pm['expirationMonth'],
				expirationYear: pm['expirationYear'],
				creditCardType: pm['creditCardType'],
			};
		case 'PayPal':
			return { type: pm['type'], BAID: pm['BAID'], email: pm['email'] };
		case 'BankTransfer':
			return {
				type: pm['type'],
				bankTransferType: pm['bankTransferType'],
				IBAN: pm['IBAN'],
				accountNumber: pm['accountNumber'],
				bankCode: pm['bankCode'],
			};
		default:
			return { type: pm['type'] };
	}
}

async function fetchCloneAccountData(
	zuoraClient: ZuoraClient,
	accountKey: string,
): Promise<CloneAccountData> {
	return zuoraClient.get(`v1/accounts/${accountKey}`, cloneAccountSchema);
}

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

	test('clones a Zuora account, creating a new account with identical data', async () => {
		const zuoraClient = await ZuoraClient.create('CODE');

		const sourceAccount = await fetchCloneAccountData(
			zuoraClient,
			sourceAccountId,
		);
		const sourcePaymentMethods = await getPaymentMethods(
			zuoraClient,
			sourceAccount.basicInfo.id,
		);

		clonedAccountNumber = await cloneAccount(zuoraClient, sourceAccountId);

		expect(clonedAccountNumber).toBeDefined();
		expect(clonedAccountNumber).not.toBe(sourceAccount.basicInfo.accountNumber);

		const clonedAccount = await fetchCloneAccountData(
			zuoraClient,
			clonedAccountNumber,
		);
		const clonedPaymentMethods = await getPaymentMethods(
			zuoraClient,
			clonedAccount.basicInfo.id,
		);

		// basicInfo: all non-system fields should match (name, notes, crmId, batch, salesRep, custom fields)
		expect(comparableBasicInfo(clonedAccount.basicInfo)).toEqual(
			comparableBasicInfo(sourceAccount.basicInfo),
		);

		// billingAndPayment: all fields except defaultPaymentMethodId (new PM is created)
		const { defaultPaymentMethodId: _srcPmId, ...sourceBilling } =
			sourceAccount.billingAndPayment;
		const { defaultPaymentMethodId: _clonePmId, ...clonedBilling } =
			clonedAccount.billingAndPayment;
		expect(clonedBilling).toEqual(sourceBilling);

		// billToContact: all non-system fields should match
		expect(comparableContact(clonedAccount.billToContact)).toEqual(
			comparableContact(sourceAccount.billToContact),
		);

		// soldToContact: all non-system fields should match when present
		if (sourceAccount.soldToContact) {
			expect(clonedAccount.soldToContact).toBeDefined();
			expect(comparableContact(clonedAccount.soldToContact!)).toEqual(
				comparableContact(sourceAccount.soldToContact),
			);
		}

		// Default payment method: key identifying fields should match
		const sourceDefaultPm = findDefaultPaymentMethod(sourcePaymentMethods);
		const clonedDefaultPm = findDefaultPaymentMethod(clonedPaymentMethods);
		expect(comparablePaymentMethod(clonedDefaultPm)).toEqual(
			comparablePaymentMethod(sourceDefaultPm),
		);
	});
});
