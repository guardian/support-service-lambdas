/* eslint-disable @typescript-eslint/require-await -- this is required to ensure the lambda returns a value*/
import { getIfDefined } from '@modules/nullAndUndefined';

export const handler = async (event: {
	discountExpiresOnDate: string;
	expiringDiscountsToProcess: Array<{
		firstName: string;
		nextPaymentDate: string;
		paymentAmount: number;
		paymentCurrency: string;
		paymentFrequency: string;
		productName: string;
		sfContactId: string;
		zuoraSubName: string;
		workEmail: string;
		contactCountry: string;
		sfBuyerContactMailingCountry: string;
		sfBuyerContactOtherCountry: string;
		sfRecipientContactMailingCountry: string;
		sfRecipientContactOtherCountry: string;
	}>;
}) => {
	try {
		const FILTER_BY_REGIONS = getIfDefined<string>(
			process.env.FILTER_BY_REGIONS,
			'FILTER_BY_REGIONS environment variable not set',
		);

		const filterByRegions = FILTER_BY_REGIONS.toLowerCase().split(',');

		const filteredSubs = event.expiringDiscountsToProcess.filter(
			(sub) =>
				filterByRegions.includes(sub.contactCountry.toLowerCase()) ||
				filterByRegions.includes(
					sub.sfBuyerContactMailingCountry.toLowerCase(),
				) ||
				filterByRegions.includes(
					sub.sfBuyerContactOtherCountry.toLowerCase(),
				) ||
				filterByRegions.includes(
					sub.sfRecipientContactMailingCountry.toLowerCase(),
				) ||
				filterByRegions.includes(
					sub.sfRecipientContactOtherCountry.toLowerCase(),
				),
		);

		return {
			...event,
			filteredSubsCount: filteredSubs.length,
			filteredSubs,
		};
	} catch (error) {
		console.error('Error:', error);
		throw error;
	}
};
