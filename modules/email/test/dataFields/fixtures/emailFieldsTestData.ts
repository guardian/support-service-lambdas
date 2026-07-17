import dayjs from 'dayjs';
import type {
	EmailDeliveryAgentDetails,
	EmailPaymentMethod,
	EmailUser,
} from '@modules/email/dataFields/dayZero/types';

export const today = '2025-11-11';
export const emailAddress = 'test@thegulocal.com';
export const subscriptionNumber = 'A-S123456';
export const mandateId = 'MANDATE_ID';
export const address = {
	lineOne: '90 York Way',
	city: 'London',
	postCode: 'N1 9GU',
	country: 'GB' as const,
};

export const deliveryContact = {
	firstName: 'Mickey',
	lastName: 'Mouse',
	workEmail: emailAddress,
	country: 'GB' as const,
	city: 'London',
	address1: '90 York Way',
	postalCode: 'N1 9GU',
};

export const deliveryAgentDetails: EmailDeliveryAgentDetails = {
	agentname: 'Test Agent',
	address1: '1 Test Street',
	address2: '',
	town: 'Croydon',
	county: 'London',
	postcode: 'BR3 1AA',
	telephone: '12343567890',
	email: 'test-agent@thegulocal.com',
};

export const emailUser: EmailUser = {
	id: '1234',
	primaryEmailAddress: emailAddress,
	firstName: 'Mickey',
	lastName: 'Mouse',
	billingAddress: address,
};

export const directDebitPaymentMethod: EmailPaymentMethod = {
	Type: 'BankTransfer',
	BankTransferAccountName: `${emailUser.firstName} ${emailUser.lastName}`,
	BankCode: '20-20-20',
	BankTransferAccountNumber: '11111111',
};

export const creditCardPaymentMethod: EmailPaymentMethod = {
	Type: 'CreditCardReferenceTransaction',
};

export const paymentSchedule = {
	payments: [
		{
			date: dayjs('2025-12-11').toDate(),
			amount: 10.0,
			amountWithoutTax: 8.0,
			taxAmount: 2.0,
		},
		{
			date: dayjs('2026-01-11').toDate(),
			amount: 12.0,
			amountWithoutTax: 10.0,
			taxAmount: 2.0,
		},
	],
};

export const fixedTermPaymentSchedule = {
	payments: [
		{
			date: dayjs('2025-12-11').toDate(),
			amount: 9,
			amountWithoutTax: 8.0,
			taxAmount: 1.0,
		},
	],
};

export const paperPaymentSchedule = {
	payments: [
		{
			date: dayjs('2025-11-18').toDate(),
			amount: 10.0,
			amountWithoutTax: 8,
			taxAmount: 2,
		},
		{
			date: dayjs('2025-12-18').toDate(),
			amount: 10.0,
			amountWithoutTax: 8,
			taxAmount: 2,
		},
	],
};
