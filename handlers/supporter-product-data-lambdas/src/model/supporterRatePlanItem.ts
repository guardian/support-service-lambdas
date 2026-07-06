import dayjs from 'dayjs';
import type { SupporterRatePlanItem } from '@modules/supporter-product-data/supporterProductData';

export class CsvDecodeError extends Error {
	constructor(message: unknown) {
		super(`Failed to decode CSV row: ${String(message)}`);
		this.name = 'CsvDecodeError';
	}
}

const csvValue = (row: Record<string, string>, key: string): string => {
	const value = row[key];
	if (value === undefined || value === '') {
		throw new CsvDecodeError(`Missing required column ${key}`);
	}
	return value;
};

export const supporterRatePlanItemFromCsvRow = (
	row: Record<string, string>,
): SupporterRatePlanItem => {
	return {
		subscriptionName: csvValue(row, 'Subscription.Name'),
		identityId: csvValue(row, 'Account.IdentityId__c'),
		productRatePlanId: csvValue(row, 'ProductRatePlan.Id'),
		productRatePlanName: csvValue(row, 'ProductRatePlan.Name'),
		termEndDate: dayjs(csvValue(row, 'Subscription.TermEndDate')),
		contractEffectiveDate: dayjs(
			csvValue(row, 'Subscription.ContractEffectiveDate'),
		),
	};
};
