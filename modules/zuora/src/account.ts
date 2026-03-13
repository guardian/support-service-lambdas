import { getPaymentMethods } from './paymentMethod';
import type { ZuoraAccount } from './types';
import {
	type CloneAccountData,
	cloneAccountSchema,
	type CloneBasicInfo,
	type CreateAccountResponse,
	createAccountResponseSchema,
	type DefaultPaymentMethodResponse,
	voidSchema,
	zuoraAccountSchema,
} from './types';
import type { ZuoraClient } from './zuoraClient';

export const getAccount = async (
	zuoraClient: ZuoraClient,
	accountNumber: string,
): Promise<ZuoraAccount> => {
	const path = `v1/accounts/${accountNumber}`;
	return zuoraClient.get(path, zuoraAccountSchema);
};

export const deleteAccount = async (
	zuoraClient: ZuoraClient,
	accountNumber: string,
): Promise<void> => {
	const path = `/v1/accounts/${accountNumber}`;
	await zuoraClient.delete(path, voidSchema);
};

export const updateAccount = async (
	zuoraClient: ZuoraClient,
	accountNumber: string,
	payload: {
		crmId?: string;
		sfContactId__c?: string;
	},
): Promise<void> => {
	const path = `/v1/accounts/${accountNumber}`;
	const body = JSON.stringify(payload);
	await zuoraClient.put(path, body, voidSchema);
};

// Fields in basicInfo that are system-generated and must not be copied to a new account
const BASIC_INFO_SYSTEM_FIELDS = new Set([
	'id',
	'name',
	'accountNumber',
	'notes',
	'status',
	'crmId',
	'batch',
	'salesRep',
	'invoiceOwnerAccountId',
	'invoiceOwnerAccountNumber',
	'invoiceOwnerAccountName',
	'createdDate',
	'updatedDate',
	'createdBy',
	'updatedBy',
	'parentId',
	'profileId',
	'profileNumber',
]);

// Fields in billToContact/soldToContact that are system-generated and must not be sent on create
const CONTACT_SYSTEM_FIELDS = new Set([
	'id',
	'accountId',
	'accountNumber',
	'contactDescription',
	'createdDate',
	'updatedDate',
	'createdBy',
	'updatedBy',
]);

function stripContactSystemFields(
	contact: Record<string, unknown>,
): Record<string, unknown> {
	return Object.fromEntries(
		Object.entries(contact).filter(([key]) => !CONTACT_SYSTEM_FIELDS.has(key)),
	);
}

function extractCustomFieldsFromBasicInfo(
	basicInfo: CloneBasicInfo,
): Record<string, unknown> {
	return Object.fromEntries(
		Object.entries(basicInfo).filter(
			([key]) => !BASIC_INFO_SYSTEM_FIELDS.has(key),
		),
	);
}

function buildPaymentMethodPayload(
	paymentMethods: DefaultPaymentMethodResponse,
): Record<string, unknown> | undefined {
	const { defaultPaymentMethodId } = paymentMethods;

	const creditCard = paymentMethods.creditcard?.find(
		(pm) => pm.id === defaultPaymentMethodId,
	);
	if (creditCard) {
		return {
			type: creditCard.type,
			cardNumber: creditCard.cardNumber,
			expirationMonth: creditCard.expirationMonth,
			expirationYear: creditCard.expirationYear,
			creditCardType: creditCard.creditCardType,
			accountHolderInfo: creditCard.accountHolderInfo,
		};
	}

	const ccRefTx = paymentMethods.creditcardreferencetransaction?.find(
		(pm) => pm.id === defaultPaymentMethodId,
	);
	if (ccRefTx) {
		return {
			type: ccRefTx.type,
			tokenId: ccRefTx.tokenId,
			secondTokenId: ccRefTx.secondTokenId,
		};
	}

	const paypal = paymentMethods.paypal?.find(
		(pm) => pm.id === defaultPaymentMethodId,
	);
	if (paypal) {
		return {
			type: paypal.type,
			BAID: paypal.BAID,
			email: paypal.email,
		};
	}

	const bankTransfer = paymentMethods.banktransfer?.find(
		(pm) => pm.id === defaultPaymentMethodId,
	);
	if (bankTransfer) {
		return {
			type: bankTransfer.type,
			bankTransferType: bankTransfer.bankTransferType,
			IBAN: bankTransfer.IBAN,
			accountNumber: bankTransfer.accountNumber,
			bankCode: bankTransfer.bankCode,
			branchCode: bankTransfer.branchCode,
			identityNumber: bankTransfer.identityNumber,
			accountHolderInfo: bankTransfer.accountHolderInfo,
			mandateInfo: bankTransfer.mandateInfo,
		};
	}

	return undefined;
}

export const cloneAccount = async (
	zuoraClient: ZuoraClient,
	accountNumber: string,
): Promise<string> => {
	const accountData = await fetchAccountForClone(zuoraClient, accountNumber);

	const paymentMethods = await getPaymentMethods(
		zuoraClient,
		accountData.basicInfo.id,
	);

	const paymentMethodPayload = buildPaymentMethodPayload(paymentMethods);

	if (!paymentMethodPayload) {
		throw new Error(
			`Could not find default payment method ${paymentMethods.defaultPaymentMethodId} for account ${accountNumber}`,
		);
	}

	const customFields = extractCustomFieldsFromBasicInfo(accountData.basicInfo);

	const createBody = {
		name: accountData.basicInfo.name,
		notes: accountData.basicInfo.notes,
		crmId: accountData.basicInfo.crmId,
		batch: accountData.basicInfo.batch,
		salesRep: accountData.basicInfo.salesRep,
		...customFields,
		billCycleDay: accountData.billingAndPayment.billCycleDay,
		currency: accountData.billingAndPayment.currency,
		paymentTerm: accountData.billingAndPayment.paymentTerm,
		paymentGateway: accountData.billingAndPayment.paymentGateway,
		invoiceDeliveryPrefsEmail:
			accountData.billingAndPayment.invoiceDeliveryPrefsEmail,
		invoiceDeliveryPrefsPrint:
			accountData.billingAndPayment.invoiceDeliveryPrefsPrint,
		autoPay: accountData.billingAndPayment.autoPay,
		billToContact: stripContactSystemFields(accountData.billToContact),
		soldToContact: accountData.soldToContact
			? stripContactSystemFields(accountData.soldToContact)
			: undefined,
		paymentMethod: paymentMethodPayload,
	};

	const response = await postNewAccount(zuoraClient, createBody);
	return response.accountNumber;
};

const fetchAccountForClone = (
	zuoraClient: ZuoraClient,
	accountNumber: string,
): Promise<CloneAccountData> =>
	zuoraClient.get(`v1/accounts/${accountNumber}`, cloneAccountSchema);

const postNewAccount = (
	zuoraClient: ZuoraClient,
	body: unknown,
): Promise<CreateAccountResponse> =>
	zuoraClient.post(
		'/v1/accounts',
		JSON.stringify(body),
		createAccountResponseSchema,
	);
