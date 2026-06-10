import { ValidationError } from '@modules/errors';
import type { IsoCountry } from '@modules/internationalisation/country';
import { logger } from '@modules/logger/logger';
import { buildErrorResponse, ok } from '@modules/routing/apiGatewayResponses';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { APIGatewayProxyResult } from 'aws-lambda';
import type { SalesTaxRequest, SalesTaxResponse } from './schemas';
import { salesTaxResponseSchema } from './schemas';

export const countryStates: Partial<
	Record<IsoCountry, Record<string, number>>
> = {
	CA: {
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
	},
};

export const salesTaxRequestEndpoint = async (
	zuoraClient: ZuoraClient,
	{ productKey, country, state }: SalesTaxRequest,
): Promise<APIGatewayProxyResult> => {
	try {
		logger.log('Checking sales tax for', {
			productKey,
			country,
			state,
		});
		return ok(
			getSalesTaxRate(zuoraClient, { productKey, country, state }),
			salesTaxResponseSchema,
		);
	} catch (error) {
		logger.error('Error fetching sales tax', error);
		return Promise.resolve(buildErrorResponse(error));
	}
};

function getSalesTaxRate(
	zuoraClient: ZuoraClient,
	{ productKey, country, state }: SalesTaxRequest,
): SalesTaxResponse {
	const validProductKey = ['SupporterPlus', 'DigitalSubscription'].includes(
		productKey,
	);
	if (!validProductKey) {
		throw new ValidationError(`invalid productKey:${productKey}`);
	}
	return { taxRate: getLocationSalesTax(country, state) };
}

function getLocationSalesTax(country: IsoCountry, state: string) {
	const salesTaxRate = countryStates[country]?.[state];
	if (!salesTaxRate) {
		const message = ['CA'].includes(country)
			? `invalid state:${state}`
			: `invalid country:${country}`;
		throw new ValidationError(message);
	}
	return salesTaxRate;
}
