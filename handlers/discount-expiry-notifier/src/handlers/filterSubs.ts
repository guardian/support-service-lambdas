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
		subName: string;
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
		const FILTER_BY_PRODUCTS = getIfDefined<string>(
			process.env.FILTER_BY_REGIONS,
			'FILTER_BY_PRODUCTS environment variable not set',
		);

		console.log('event: ', event);
		console.log('FILTER_BY_REGIONS: ', FILTER_BY_REGIONS);
		console.log('FILTER_BY_PRODUCTS: ', FILTER_BY_PRODUCTS);

		const filterByRegions = FILTER_BY_REGIONS.split(',');
		const filterByProducts = FILTER_BY_PRODUCTS.split(',');

		const subsFilteredByRegions = event.expiringDiscountsToProcess.filter(
			(sub) =>
				filterByRegions.includes(sub.contactCountry) ||
				filterByRegions.includes(sub.sfBuyerContactMailingCountry) ||
				filterByRegions.includes(sub.sfBuyerContactOtherCountry) ||
				filterByRegions.includes(sub.sfRecipientContactMailingCountry) ||
				filterByRegions.includes(sub.sfRecipientContactOtherCountry),
		);

		const subsFilteredByRegionsAndProducts = subsFilteredByRegions.filter(
			(sub) => filterByProducts.includes(sub.productName),
		);

		console.log('subsFilteredByRegions: ', subsFilteredByRegions);
		console.log(
			'subsFilteredByRegionsAndProducts: ',
			subsFilteredByRegionsAndProducts,
		);

		return {
			...event,
			subsFilteredByRegionsAndProducts,
		};
	} catch (error) {
		console.error('Error:', error);
		throw error; // Ensure errors propagate correctly
	}
};
