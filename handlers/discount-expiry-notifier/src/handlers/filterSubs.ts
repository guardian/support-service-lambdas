/* eslint-disable @typescript-eslint/require-await -- this is required to ensure the lambda returns a value*/
import { getIfDefined } from '@modules/nullAndUndefined';
import { z } from 'zod';
import { BigQueryResultDataSchema } from '../types';

export const FilterSubsInputSchema = z
	.object({
		discountExpiresOnDate: z.string(),
		allRecordsFromBigQuery: BigQueryResultDataSchema,
		allRecordsFromBigQueryCount: z.number(),
	})
	.strict();

export type FilterSubsInput = z.infer<typeof FilterSubsInputSchema>;

export const handler = async (event: FilterSubsInput) => {
	try {
		const parsedEventResult = FilterSubsInputSchema.safeParse(event);

		if (!parsedEventResult.success) {
			throw new Error('Invalid event data');
		}
		const parsedEvent = parsedEventResult.data;

		const FILTER_BY_REGIONS = getIfDefined<string>(
			process.env.FILTER_BY_REGIONS,
			'FILTER_BY_REGIONS environment variable not set',
		);

		const filterByRegions = FILTER_BY_REGIONS.toLowerCase().split(',');

		const filteredRecords = parsedEvent.allRecordsFromBigQuery.filter(
			(sub) =>
				filterByRegions.includes(sub.contactCountry?.toLowerCase() ?? '') ||
				filterByRegions.includes(
					sub.sfBuyerContactMailingCountry?.toLowerCase() ?? '',
				) ||
				filterByRegions.includes(
					sub.sfBuyerContactOtherCountry?.toLowerCase() ?? '',
				) ||
				filterByRegions.includes(
					sub.sfRecipientContactMailingCountry?.toLowerCase() ?? '',
				) ||
				filterByRegions.includes(
					sub.sfRecipientContactOtherCountry?.toLowerCase() ?? '',
				),
		);

		return {
			...parsedEvent,
			recordsForEmailSendCount: filteredRecords.length,
			recordsForEmailSend: filteredRecords,
		};
	} catch (error) {
		console.error('Error:', error);
		throw error;
	}
};
