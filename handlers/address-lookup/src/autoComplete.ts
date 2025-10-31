import type { GeoPlacesClient } from '@aws-sdk/client-geo-places';
import { AutocompleteCommand } from '@aws-sdk/client-geo-places';
import { z } from 'zod';

const addressSchema = z.object({
	Label: z.string(),
	Country: z.object({
		Code2: z.string(),
		Code3: z.string(),
		Name: z.string(),
	}),
	Region: z
		.object({
			Name: z.string(),
		})
		.optional(),
	SubRegion: z
		.object({
			Code: z.string().optional(),
			Name: z.string(),
		})
		.optional(),
	Locality: z.string().optional(),
	District: z.string().optional(),
	PostalCode: z.string().optional(),
	Street: z.string().optional(),
	AddressNumber: z.string().optional(),
});

export const placeSchema = z.object({
	PlaceId: z.string(),
	PlaceType: z.string(),
	Title: z.string(),
	Address: addressSchema,
});

const responseSchema = z.object({
	ResultItems: placeSchema.array(),
});

export const autocomplete = async (
	client: GeoPlacesClient,
	searchTerm: string,
	maxResults: number,
) => {
	const command = new AutocompleteCommand({
		QueryText: searchTerm,
		MaxResults: maxResults,
		Language: 'en',
		AdditionalFeatures: ['Core'],
		IntendedUse: 'SingleUse',
	});

	const raw = await client.send(command);

	const parseResult = responseSchema.safeParse(raw);
	if (!parseResult.success) {
		console.error(
			`Failed to parse autocomplete response: ${JSON.stringify(
				raw,
				null,
				2,
			)} because of error:`,
			parseResult.error,
		);
		throw new Error('Failed to parse autocomplete response');
	}
	return parseResult.data;
};
