import { ValidationError } from '@modules/errors';
import { getCountryNameByIsoCode } from '@modules/internationalisation/country';
import { logger } from '@modules/logger/logger';
import type { productKeySchema } from '@modules/product-catalog/productCatalogSchema';
import { buildErrorResponse, ok } from '@modules/routing/apiGatewayResponses';
import { getZuoraTaxCodes, getZuoraTaxRates } from '@modules/zuora/tax';
import {
	type ZuoraTaxCode,
	zuoraTaxCodeSchema,
	zuoraTaxRateSchema,
} from '@modules/zuora/types/objects/tax';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { APIGatewayProxyResult } from 'aws-lambda';
import type z from 'zod';
import type { ZuoraGetRatesPath } from './schemas';
import {
	type TaxRatesRequest,
	type TaxRatesResponse,
	taxRatesResponseSchema,
} from './schemas';

type ProductKey = z.infer<typeof productKeySchema>;
const taxExclusiveProductNames: Partial<Record<ProductKey, string>> = {
	SupporterPlus: `Supporter Plus`,
	DigitalSubscription: `Digital Pack`,
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

export const zuoraTaxCodesEndpoint = async (
	zuoraClient: ZuoraClient,
): Promise<APIGatewayProxyResult> => {
	try {
		logger.log('Retrieving Zuora codes');
		return ok(
			await Promise.resolve(getZuoraTaxCodes(zuoraClient)),
			zuoraTaxCodeSchema,
		);
	} catch (error) {
		logger.error('Error fetching Zuora codes', error);
		return Promise.resolve(buildErrorResponse(error));
	}
};

export const zuoraTaxRatesEndpoint = async (
	zuoraClient: ZuoraClient,
	path: ZuoraGetRatesPath,
): Promise<APIGatewayProxyResult> => {
	try {
		logger.log('Retrieving Zuora rates');
		return ok(
			await Promise.resolve(getZuoraTaxRates(zuoraClient, path.id)),
			zuoraTaxRateSchema,
		);
	} catch (error) {
		logger.error('Error fetching Zuora rates', error);
		return Promise.resolve(buildErrorResponse(error));
	}
};

export const taxRatesEndpoint = async (
	zuoraClient: ZuoraClient,
	{ productKey, country }: TaxRatesRequest,
): Promise<APIGatewayProxyResult> => {
	try {
		logger.log('Retrieving Zuora taxes for', {
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
		logger.error('Error fetching Zuora taxes', error);
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
			zuoraTaxCode.name === taxExclusiveProductNames[productKey],
	);
}

function isTaxRateKey(key: string): key is keyof TaxRatesResponse {
	return key in cadStates;
}
