import { ValidationError } from '@modules/errors';
import { getCountryNameByIsoCode } from '@modules/internationalisation/country';
import { logger } from '@modules/logger/logger';
import type { productKeySchema } from '@modules/product-catalog/productCatalogSchema';
import { buildErrorResponse, ok } from '@modules/routing/apiGatewayResponses';
import { getZuoraTaxCodes, getZuoraTaxRates } from '@modules/zuora/tax';
import type { ZuoraTaxCode } from '@modules/zuora/types/objects/tax';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { APIGatewayProxyResult } from 'aws-lambda';
import type z from 'zod';
import {
	type TaxRatesRequest,
	type TaxRatesResponse,
	taxRatesResponseSchema,
} from './schemas';

type ProductKey = z.infer<typeof productKeySchema>;
const taxExclusiveZuoraTaxCodes: Partial<Record<ProductKey, string>> = {
	SupporterPlus: `Supporter Plus Global Tax`,
	DigitalSubscription: `Digital Pack Global Tax`,
};

export const caStatesReverse: Record<string, string> = {
	Alberta: 'AB',
	'British Columbia': 'BC',
	Manitoba: 'MB',
	'New Brunswick': 'NB',
	'Newfoundland and Labrador': 'NL',
	'Northwest Territories': 'NT',
	'Nova Scotia': 'NS',
	Nunavut: 'NU',
	Ontario: 'ON',
	'Prince Edward Island': 'PE',
	Quebec: 'QC',
	Saskatchewan: 'SK',
	Yukon: 'YT',
};

export const cadStates: TaxRatesResponse = {
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

export const taxRatesRequestEndpoint = async ({
	productKey,
	country,
}: TaxRatesRequest): Promise<APIGatewayProxyResult> => {
	try {
		logger.log('Retrieving sales taxes for', {
			productKey,
			country,
		});
		return ok(
			getSalesTaxRates({ productKey, country }),
			taxRatesResponseSchema,
		);
	} catch (error) {
		logger.error('Error fetching sales tax', error);
		return Promise.resolve(buildErrorResponse(error));
	}
};

function getSalesTaxRates({
	productKey,
	country,
}: TaxRatesRequest): TaxRatesResponse {
	if (!['SupporterPlus', 'DigitalSubscription'].includes(productKey)) {
		throw new ValidationError(`invalid productKey:${productKey}`);
	}
	if (!['CA'].includes(country)) {
		throw new ValidationError(`invalid country:${country}`);
	}
	return cadStates;
}

export const taxRateZuoraRequestEndpoint = async (
	zuoraClient: ZuoraClient,
	{ productKey, country }: TaxRatesRequest,
): Promise<APIGatewayProxyResult> => {
	try {
		logger.log('Retrieving sales taxes for', {
			productKey,
			country,
		});
		return ok(
			await Promise.resolve(
				getZuoraSalesTaxRates(zuoraClient, { productKey, country }),
			),
			taxRatesResponseSchema,
		);
	} catch (error) {
		logger.error('Error fetching sales tax', error);
		return Promise.resolve(buildErrorResponse(error));
	}
};

async function getZuoraSalesTaxRates(
	zuoraClient: ZuoraClient,
	{ productKey, country }: TaxRatesRequest,
): Promise<TaxRatesResponse> {
	if (!['CA'].includes(country)) {
		throw new ValidationError(`invalid country:${country}`);
	}

	const zuoraTaxCodes = await getZuoraTaxCodes(zuoraClient);
	const exclusiveZuoraTaxId = findTaxExclusiveProductZuoraTaxId(
		productKey,
		zuoraTaxCodes.taxCodes,
	);
	if (!exclusiveZuoraTaxId) {
		throw new ValidationError(`invalid productKey:${productKey}`);
	}

	const zuoraTaxRates = await getZuoraTaxRates(
		zuoraClient,
		exclusiveZuoraTaxId.id,
	);
	const countryZuoraTaxRates = zuoraTaxRates.taxRates.filter(
		(zuoraTaxRate) => zuoraTaxRate.country === getCountryNameByIsoCode(country),
	);
	const zuoreTaxRateEntries = countryZuoraTaxRates.map((zuoraTaxRate) => {
		return [
			caStatesReverse[zuoraTaxRate.state] ?? ``,
			zuoraTaxRate.taxRate1,
		] as const;
	});

	const caTaxRates: TaxRatesResponse = { ...cadStates };
	for (const [key, value] of zuoreTaxRateEntries) {
		if (isTaxRateKey(key)) {
			caTaxRates[key] = value;
		}
	}

	return caTaxRates;
}

function findTaxExclusiveProductZuoraTaxId(
	productKey: ProductKey,
	zuoraTaxCodes: ZuoraTaxCode[],
) {
	return zuoraTaxCodes.find(
		(zuoraTaxCode) =>
			zuoraTaxCode.name === taxExclusiveZuoraTaxCodes[productKey],
	);
}

function isTaxRateKey(key: string): key is keyof TaxRatesResponse {
	return key in cadStates;
}
