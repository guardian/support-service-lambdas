import { getIfDefined } from '@modules/nullAndUndefined';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import minMax from 'dayjs/plugin/minMax';
import type { EmailPaymentMethod } from './types';

dayjs.extend(minMax);

const DIRECT_DEBIT_LEAD_TIME_DAYS = 10;

export function formatDate(date: Dayjs) {
	return date.format('dddd, D MMMM YYYY');
}

export function mask(accountNumber: string): string {
	// Replace all but the last two characters with asterisks
	return accountNumber.replace(/.(?=.{2})/g, '*');
}

export function hyphenate(sortCode: string): string {
	return sortCode.replace(/(\d{2})(\d{2})(\d{2})/, '$1-$2-$3');
}

export type EmailPaymentFields =
	| {
			payment_method: 'Credit/Debit Card' | 'PayPal';
			first_payment_date: string;
	  }
	| {
			payment_method: 'Direct Debit';
			first_payment_date: string;
			account_holder: string;
			bank_account_no: string;
			bank_sort_code: string;
			mandate_id: string;
	  };

function getFirstPaymentDateCopy(
	paymentMethod: EmailPaymentMethod,
	firstZuoraPaymentDate: Dayjs,
	today: Dayjs,
): string {
	const firstPaymentDateFormatted = formatDate(firstZuoraPaymentDate);

	if (paymentMethod.Type !== 'BankTransfer') {
		return firstPaymentDateFormatted;
	}

	const isFirstPaymentLessThan10DaysAway =
		firstZuoraPaymentDate < today.add(DIRECT_DEBIT_LEAD_TIME_DAYS, 'day');
	const directDebitDisclaimer = isFirstPaymentLessThan10DaysAway
		? ' (Direct Debit may be up to 10 days after this)'
		: '';

	return `${firstPaymentDateFormatted}${directDebitDisclaimer}`;
}

export function getPaymentFields(
	today: Dayjs,
	paymentMethod: EmailPaymentMethod,
	firstZuoraPaymentDate: Dayjs,
	mandateId?: string,
): EmailPaymentFields {
	const firstPaymentDateCopy = getFirstPaymentDateCopy(
		paymentMethod,
		firstZuoraPaymentDate,
		today,
	);

	switch (paymentMethod.Type) {
		case 'BankTransfer': {
			return {
				bank_account_no: mask(paymentMethod.BankTransferAccountNumber),
				bank_sort_code: hyphenate(paymentMethod.BankCode),
				account_holder: paymentMethod.BankTransferAccountName,
				payment_method: 'Direct Debit',
				mandate_id: mandateId ?? '',
				first_payment_date: firstPaymentDateCopy,
			};
		}
		case 'CreditCardReferenceTransaction':
			return {
				payment_method: 'Credit/Debit Card',
				first_payment_date: firstPaymentDateCopy,
			};
		case 'PayPal':
			return {
				payment_method: 'PayPal',
				first_payment_date: firstPaymentDateCopy,
			};
	}
}

export function getPaymentMethodFieldsSupporterPlus(
	paymentMethod: EmailPaymentMethod,
	created: Dayjs,
	mandateId?: string,
):
	| undefined
	| {
			payment_method: 'Direct Debit';
			account_name: string;
			account_number: string;
			sort_code: string;
			Mandate_ID: string;
	  } {
	switch (paymentMethod.Type) {
		case 'BankTransfer':
			return {
				payment_method: 'Direct Debit',
				account_name: paymentMethod.BankTransferAccountName,
				account_number: mask(paymentMethod.BankTransferAccountNumber),
				sort_code: paymentMethod.BankCode,
				Mandate_ID: getIfDefined(
					mandateId,
					'No Mandate ID was provided for a Direct Debit payment',
				),
			};
		case 'CreditCardReferenceTransaction':
		case 'PayPal':
			return undefined;
	}
}
