import { ValidationError } from '@modules/errors';
import type { IsoCountry } from '@modules/internationalisation/country';
import { isoCountrySchema } from '@modules/internationalisation/schemas';
import { logger } from '@modules/logger/logger';
import { productKeySchema } from '@modules/product-catalog/productCatalogSchema';
import { buildErrorResponse, ok } from '@modules/routing/apiGatewayResponses';
import type { APIGatewayProxyResult } from 'aws-lambda';
import { z } from 'zod';

export const stateCAD: Record<string, number> = {
	AB: 0.05,
	BC: 0.12,
	MB: 0.12,
	NB: 0.15,
	NL: 0.15,
	NT: 0.15,
	NS: 0.15,
	NU: 0.05,
	ON: 0.13,
	PE: 0.15,
	QC: 0.1498,
	SK: 0.11,
	YT: 0.05,
};

export const salesTaxRequestSchema = z.object({
	productKey: productKeySchema,
	country: isoCountrySchema,
	state: z.string(),
});
export type SalesTaxRequest = z.infer<typeof salesTaxRequestSchema>;

const salesTaxResponseSchema = z.object({
	taxRate: z.number(),
});
export type SalesTaxResponse = z.infer<typeof salesTaxResponseSchema>;

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
			ok(
				getSalesTaxRate({ productKey, country, state }),
				salesTaxResponseSchema,
			),
		);
	} catch (error) {
		logger.error('Error fetching sales tax', error);
		return Promise.resolve(buildErrorResponse(error));
	}
}

function getSalesTaxRate({
	productKey,
	country,
	state,
}: SalesTaxRequest): SalesTaxResponse {
	const validProductKey = ['SupporterPlus', 'DigitalSubscription'].includes(
		productKey,
	);
	if (!validProductKey) {
		throw new ValidationError(`invalid productKey:${productKey}`);
	}
	return { taxRate: getLocationSalesTax(country, state) };
}

function getLocationSalesTax(country: IsoCountry, state: string) {
	if (['CA'].includes(country)) {
		const salesTaxRate = stateCAD[state];
		if (salesTaxRate) {
			return salesTaxRate;
		}
		throw new ValidationError(`invalid state:${state}`);
	}
	throw new ValidationError(`invalid country:${country}`);
}
