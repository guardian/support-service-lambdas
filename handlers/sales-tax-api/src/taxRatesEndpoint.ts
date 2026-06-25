import { ValidationError } from '@modules/errors';
import type { CaState, IsoCountry } from '@modules/internationalisation/country';
import {
	caStates,
	caStateSchema,
	getCountryNameByIsoCode,
} from '@modules/internationalisation/country';
import { logger } from '@modules/logger/logger';
import type { ProductKey } from '@modules/product-catalog/productCatalog';
import { ok } from '@modules/routing/apiGatewayResponses';
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
import type { TaxRatesResponse} from './schemas';
import { type TaxRatesRequest, taxRatesResponseSchema } from './schemas';

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

	return ok(await getZuoraSalesTaxRates(zuoraClient, { productKey, country }));
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
		throw new Error(`No tax data found for productKey: ${productKey}`);
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
		throw new Error(`invalid period for productKey:${productKey}`);
	}

	const zuoraTaxRates = await getZuoraTaxRates(zuoraClient, zuoraTaxPeriod.id);
	const cadZuoraTaxRates = extractZuoraTaxRatesForCountry(
		zuoraTaxRates.taxRates,
		country,
	);

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

function extractZuoraTaxRatesForCountry(
	zuoraTaxRates: ZuoraTaxRate[],
	country: IsoCountry,
): ZuoraTaxRate[] {
	return zuoraTaxRates.filter(
		(zuoraTaxRate) => zuoraTaxRate.country === getCountryNameByIsoCode(country),
	);
}

function createCadStateTaxRates(
	cadZuoraTaxRates: ZuoraTaxRate[],
): TaxRatesResponse {
	const stateCodes = caStateSchema.options;
	const missingStateCodes: CaState[] = [];

	const taxCodesByState = stateCodes.reduce<Partial<TaxRatesResponse>>(
		(memo: Partial<TaxRatesResponse>, stateCode: CaState): Partial<TaxRatesResponse> => {
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
		throw new Error(
			`Zuora is missing tax rates for the following CA provinces: ${missingStateCodes.join(', ')}`,
		);
	}

	const parsedResult = taxRatesResponseSchema.safeParse(taxCodesByState);

	if (!parsedResult.success) {
		// It shouldn't be possible to get here since we already validated all CA states
		// are present above. But it's useful to resolve the type to a complete TaxRatesResponse
		throw new Error('Failed to parse constructed CAD tax rates');
	}

	return parsedResult.data;
}
