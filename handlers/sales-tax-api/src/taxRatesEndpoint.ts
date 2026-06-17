import { ValidationError } from '@modules/errors';
import {
	caStates,
	getCountryNameByIsoCode,
} from '@modules/internationalisation/country';
import { logger } from '@modules/logger/logger';
import type { productKeySchema } from '@modules/product-catalog/productCatalogSchema';
import { buildErrorResponse, ok } from '@modules/routing/apiGatewayResponses';
import {
	getZuoraTaxCodes,
	getZuoraTaxPeriods,
	getZuoraTaxRates,
} from '@modules/zuora/tax';
import type {
	ZuoraTaxPeriod,
	ZuoraTaxRate,
} from '@modules/zuora/types/objects/tax';
import { type ZuoraTaxCode } from '@modules/zuora/types/objects/tax';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { APIGatewayProxyResult } from 'aws-lambda';
import type { z } from 'zod';
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

const caStatesDefault: TaxRatesResponse = {
	AB: 0,
	BC: 0,
	MB: 0,
	NB: 0,
	NL: 0,
	NT: 0,
	NS: 0,
	NU: 0,
	ON: 0,
	PE: 0,
	QC: 0,
	SK: 0,
	YT: 0,
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
			await getZuoraSalesTaxRates(zuoraClient, { productKey, country }),
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
	if (!zuoraTaxCodes) {
		throw new Error('no tax codes found');
	}
	const zuoraTaxCode = getProductZuoraTaxCode(
		productKey,
		zuoraTaxCodes.taxCodes,
	);
	if (!zuoraTaxCode) {
		throw new ValidationError(`invalid productKey:${productKey}`);
	}

	const zuoraTaxPeriods = await getZuoraTaxPeriods(zuoraClient);
	if (!zuoraTaxPeriods) {
		throw new Error('no tax periods found');
	}
	const zuoraTaxPeriod = getZuoraTaxPeriod(
		zuoraTaxCode.id,
		zuoraTaxPeriods.taxRatePeriods,
	);
	if (!zuoraTaxPeriod) {
		throw new ValidationError(`invalid period for productKey:${productKey}`);
	}

	const zuoraTaxRates = await getZuoraTaxRates(zuoraClient, zuoraTaxPeriod.id);
	const cadZuoraTaxRates = getCadZuoraTaxRates(zuoraTaxRates.taxRates);
	return createCadStateTaxRates(cadZuoraTaxRates);
}

function getProductZuoraTaxCode(
	productKey: ProductKey,
	zuoraTaxCodes: ZuoraTaxCode[],
) {
	return zuoraTaxCodes.find(
		(zuoraTaxCode) =>
			zuoraTaxCode.name === taxExclusiveProductNames[productKey],
	);
}

function getZuoraTaxPeriod(
	zuoraTaxCode: string,
	zuoraTaxPeriods: ZuoraTaxPeriod[],
) {
	return zuoraTaxPeriods.find(
		(zuoraTaxPeriod) => zuoraTaxPeriod.taxCodeId === zuoraTaxCode,
	);
}

function getCadZuoraTaxRates(zuoraTaxRates: ZuoraTaxRate[]): ZuoraTaxRate[] {
	return zuoraTaxRates.filter(
		(zuoraTaxRate) => zuoraTaxRate.country === getCountryNameByIsoCode('CA'),
	);
}

function createCadStateTaxRates(
	cadZuoraTaxRates: ZuoraTaxRate[],
): TaxRatesResponse {
	const cadStateTaxRates: TaxRatesResponse = { ...caStatesDefault };
	Object.keys(cadStateTaxRates).forEach((key) => {
		if (isTaxRateKey(key)) {
			const zuoraTaxRate = cadZuoraTaxRates.find(
				(zuoraTaxRate) => caStates[key] === zuoraTaxRate.state,
			);
			cadStateTaxRates[key] = zuoraTaxRate?.taxRate1 ?? 0;
		}
	});
	return cadStateTaxRates;
}
function isTaxRateKey(key: string): key is keyof TaxRatesResponse {
	return key in caStatesDefault;
}
