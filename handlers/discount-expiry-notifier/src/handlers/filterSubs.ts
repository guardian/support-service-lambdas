/* eslint-disable @typescript-eslint/require-await -- this is required to ensure the lambda returns a value*/
import { getIfDefined } from '@modules/nullAndUndefined';
import type { ExpiringDiscountToProcess } from '../types';

export const handler = async (event: {
	discountExpiresOnDate: string;
	expiringDiscountsToProcess: ExpiringDiscountToProcess[];
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
