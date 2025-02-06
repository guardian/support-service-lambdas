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

		const filterByRegions = FILTER_BY_REGIONS.split(',');

		const filteredSubs = event.expiringDiscountsToProcess.filter(
			(sub) =>
				filterByRegions.includes(sub.contactCountry) ||
				filterByRegions.includes(sub.sfBuyerContactMailingCountry) ||
				filterByRegions.includes(sub.sfBuyerContactOtherCountry) ||
				filterByRegions.includes(sub.sfRecipientContactMailingCountry) ||
				filterByRegions.includes(sub.sfRecipientContactOtherCountry),
		);

		return {
			...event,
			filteredSubs,
		};
	} catch (error) {
		console.error('Error:', error);
		throw error;
	}
};
