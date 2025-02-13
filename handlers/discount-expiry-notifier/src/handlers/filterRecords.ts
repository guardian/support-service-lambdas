/* eslint-disable @typescript-eslint/require-await -- this is required to ensure the lambda returns a value*/
import { getIfDefined } from '@modules/nullAndUndefined';
import { z } from 'zod';
import { BigQueryResultDataSchema } from '../types';

export const FilterRecordsInputSchema = z
	.object({
		discountExpiresOnDate: z.string(),
		allRecordsFromBigQuery: BigQueryResultDataSchema,
		allRecordsFromBigQueryCount: z.number(),
	})
	.strict();

export type FilterRecordsInput = z.infer<typeof FilterRecordsInputSchema>;

export const handler = async (event: FilterRecordsInput) => {
	try {
		const parsedEventResult = FilterRecordsInputSchema.safeParse(event);

		if (!parsedEventResult.success) {
			throw new Error('Invalid event data');
		}
		const parsedEvent = parsedEventResult.data;

		const FILTER_BY_REGIONS = getIfDefined<string>(
			process.env.FILTER_BY_REGIONS,
			'FILTER_BY_REGIONS environment variable not set',
		);

		const filterByRegions = FILTER_BY_REGIONS.toLowerCase().split(',');

		// const filteredRecords = parsedEvent.allRecordsFromBigQuery.filter(
		// 	(record) =>
		// 		filterByRegions.includes(record.contactCountry?.toLowerCase() ?? '') ||
		// 		filterByRegions.includes(
		// 			record.sfBuyerContactMailingCountry?.toLowerCase() ?? '',
		// 		) ||
		// 		filterByRegions.includes(
		// 			record.sfBuyerContactOtherCountry?.toLowerCase() ?? '',
		// 		) ||
		// 		filterByRegions.includes(
		// 			record.sfRecipientContactMailingCountry?.toLowerCase() ?? '',
		// 		) ||
		// 		filterByRegions.includes(
		// 			record.sfRecipientContactOtherCountry?.toLowerCase() ?? '',
		// 		),
		// );
		const filteredRecords = parsedEvent.allRecordsFromBigQuery;

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
