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
import type { CaTaxRateState, TaxRatesResponse } from './schemas';
import { type TaxRatesRequest, taxRatesResponseSchema } from './schemas';

export class InternalServerError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'InternalServerError';
	}
}

type ProductKey = z.infer<typeof productKeySchema>;
type TaxCodeName = 'Supporter Plus Global Tax' | 'Digital Pack Global Tax';
const taxExclusiveProductCodeNames: Partial<Record<ProductKey, TaxCodeName>> = {
	SupporterPlus: `Supporter Plus Global Tax`,
	DigitalSubscription: `Digital Pack Global Tax`,
};

export const taxRatesEndpoint = async (
	zuoraClient: ZuoraClient,
	{ productKey, country }: TaxRatesRequest,
): Promise<APIGatewayProxyResult> => {
	logger.log('Retrieving Zuora taxes for', {
		productKey,
		country,
	});

	try {
		return ok(
			await getZuoraSalesTaxRates(zuoraClient, { productKey, country }),
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
	const cadZuoraTaxRates = extractCadZuoraTaxRates(zuoraTaxRates.taxRates);

	return createCadStateTaxRates(cadZuoraTaxRates);
}

function getProductZuoraTaxCode(
	productKey: ProductKey,
	zuoraTaxCodes: ZuoraTaxCode[],
) {
	return zuoraTaxCodes.find(
		(zuoraTaxCode) =>
			zuoraTaxCode.name === taxExclusiveProductCodeNames[productKey],
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

function extractCadZuoraTaxRates(
	zuoraTaxRates: ZuoraTaxRate[],
): ZuoraTaxRate[] {
	return zuoraTaxRates.filter(
		(zuoraTaxRate) => zuoraTaxRate.country === getCountryNameByIsoCode('CA'),
	);
}

function createCadStateTaxRates(
	cadZuoraTaxRates: ZuoraTaxRate[],
): TaxRatesResponse {
	const stateCodes = taxRatesResponseSchema.keyof().options;
	const missingStateCodes: CaTaxRateState[] = [];

	const taxCodesByState = stateCodes.reduce<Partial<TaxRatesResponse>>(
		(memo: Partial<TaxRatesResponse>, stateCode: CaTaxRateState) => {
			const zuoraTaxRate = cadZuoraTaxRates.find(
				(zuoraTaxRate) => caStates[stateCode] === zuoraTaxRate.state,
			);

			if (zuoraTaxRate) {
				memo[stateCode] = zuoraTaxRate.taxRate1;
			} else {
				missingStateCodes.push(stateCode);
			}

			return memo;
		},
		{},
	);

	if (missingStateCodes.length > 0) {
		throw new InternalServerError(
			`Zuora is missing tax rates for the following CA provinces: ${missingStateCodes.join(', ')}`,
		);
	}

	const parsedResult = taxRatesResponseSchema.safeParse(taxCodesByState);

	if (!parsedResult.success) {
		// It shouldn't be possible to get here since we already validated all CA states
		// are present above. But it's useful to resolve the type to a complete TaxRatesResponse
		throw new InternalServerError('Failed to parse constructed CAD tax rates');
	}

	return parsedResult.data;
}
