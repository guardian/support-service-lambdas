import { ValidationError } from '@modules/errors';
import { isoCountrySchema } from '@modules/internationalisation/schemas';
import { logger } from '@modules/logger/logger';
import { productKeySchema } from '@modules/product-catalog/productCatalogSchema';
import { buildErrorResponse, ok } from '@modules/routing/apiGatewayResponses';
import type { APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';

export const salesTaxRequestSchema = z.object({
	productKey: productKeySchema,
	country: isoCountrySchema,
	state: z.string(),
});
export type SalesTaxRequest = z.infer<typeof salesTaxRequestSchema>;

const salesTaxResponseSchema = z.object({
	taxRate: z.number(),
});
type SalesTaxResponse = z.infer<typeof salesTaxResponseSchema>;

export function salesTaxRequestEndpoint({
	productKey,
	country,
	state,
}: SalesTaxRequest): Promise<APIGatewayProxyResult> {
	try {
		logger.log('Checking sales tax for', {
			productKey,
			country,
			state,
		});
		return Promise.resolve(
			ok(getTaxRate({ productKey, country, state }), salesTaxResponseSchema),
		);
	} catch (error) {
		logger.error('Error fetching sales tax', error);
		return Promise.resolve(buildErrorResponse(error));
	}
}

function getTaxRate({
	productKey,
	country,
	state,
}: SalesTaxRequest): SalesTaxResponse {
	const validProductKey = ['SupporterPlus', 'DigitalSubscription'].includes(
		productKey,
	);
	if (!validProductKey) {
		throw new ValidationError(`invalid productKey ${productKey}`);
	}
	const validCountry = ['CA'].includes(country);
	if (!validCountry) {
		throw new ValidationError(`invalid country ${validCountry}`);
	}
	const validState = ['ON'].includes(state);
	if (!validState) {
		throw new ValidationError(`invalid country ${validCountry}`);
	}

	return { taxRate: 0.13 };
}
