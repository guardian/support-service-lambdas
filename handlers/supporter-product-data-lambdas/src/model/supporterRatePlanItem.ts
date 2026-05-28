import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { z } from 'zod';

dayjs.extend(utc);

const contributionAmountSchema = z.object({
	amount: z.number(),
	currency: z.string(),
});

export type ContributionAmount = z.infer<typeof contributionAmountSchema>;

export const supporterRatePlanItemSchema = z.object({
	subscriptionName: z.string(),
	identityId: z.string(),
	productRatePlanId: z.string(),
	productRatePlanName: z.string(),
	termEndDate: z.string(),
	contractEffectiveDate: z.string(),
	contributionAmount: contributionAmountSchema.optional(),
});

export type SupporterRatePlanItem = z.infer<typeof supporterRatePlanItemSchema>;

const toIsoDate = (value: string): string => {
	const parsed = dayjs.utc(value);
	if (!parsed.isValid()) {
		return value;
	}
	return parsed.format('YYYY-MM-DD');
};

const csvValue = (
	row: Record<string, string>,
	key: string,
	lineNumber: number,
): string => {
	const value = row[key];
	if (value === undefined || value === '') {
		throw new Error(`Missing required column ${key} on line ${lineNumber}`);
	}
	return value;
};

export const supporterRatePlanItemFromCsvRow = (
	row: Record<string, string>,
	lineNumber: number,
): SupporterRatePlanItem => ({
	subscriptionName: csvValue(row, 'Subscription.Name', lineNumber),
	identityId: csvValue(row, 'Account.IdentityId__c', lineNumber),
	productRatePlanId: csvValue(row, 'ProductRatePlan.Id', lineNumber),
	productRatePlanName: csvValue(row, 'ProductRatePlan.Name', lineNumber),
	termEndDate: toIsoDate(csvValue(row, 'Subscription.TermEndDate', lineNumber)),
	contractEffectiveDate: toIsoDate(
		csvValue(row, 'Subscription.ContractEffectiveDate', lineNumber),
	),
});
