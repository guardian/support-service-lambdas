import { GeoPlacesClient } from '@aws-sdk/client-geo-places';
import type {
	APIGatewayProxyEvent,
	APIGatewayProxyResult,
	Handler,
} from 'aws-lambda';
import { z } from 'zod';
import { autocomplete } from './autoComplete';

const geoPlacesClient = new GeoPlacesClient({ region: 'eu-west-1' });

const inputSchema = z.object({
	searchTerm: z.string(),
	maxResults: z.number().optional().default(10),
});

export const handler: Handler = async (
	event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
	console.log(`Input is ${JSON.stringify(event)}`);

	const input = inputSchema.parse(event.body);
	const results = await autocomplete(
		geoPlacesClient,
		input.searchTerm,
		input.maxResults,
	);
	return {
		statusCode: 200,
		body: JSON.stringify(results),
	};
};
