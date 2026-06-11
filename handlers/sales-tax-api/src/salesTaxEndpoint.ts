import { ValidationError } from '@modules/errors';
import type {
	CaState,
	IsoCountry,
} from '@modules/internationalisation/country';
import { logger } from '@modules/logger/logger';
import type { productKeySchema } from '@modules/product-catalog/productCatalogSchema';
import { buildErrorResponse, ok } from '@modules/routing/apiGatewayResponses';
import { getZuoraTaxCodes, getZuoraTaxRates } from '@modules/zuora/tax';
import type {
	ZuoraTaxCode,
	ZuoraTaxRate,
} from '@modules/zuora/types/objects/tax';
import type { ZuoraClient } from '@modules/zuora/zuoraClient';
import type { APIGatewayProxyResult } from 'aws-lambda';
import type z from 'zod';
import type { SalesTaxRequest, SalesTaxResponse } from './schemas';
import { salesTaxResponseSchema } from './schemas';

export type ProductKey = z.infer<typeof productKeySchema>;
const taxExclusiveZuoraTaxCodes: Partial<Record<ProductKey, string>> = {
	SupporterPlus: `Supporter Plus Global Tax`,
	DigitalSubscription: `Digital Pack Global Tax`,
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
			await Promise.resolve(
				getSalesTaxRate(zuoraClient, { productKey, country, state }),
			),
			salesTaxResponseSchema,
		);
	} catch (error) {
		logger.error('Error fetching sales tax', error);
		return Promise.resolve(buildErrorResponse(error));
	}
};

async function getSalesTaxRate(
	zuoraClient: ZuoraClient,
	{ productKey, country, state }: SalesTaxRequest,
): Promise<SalesTaxResponse> {
	const zuoraTaxCodes = await getZuoraTaxCodes(zuoraClient);
	const exclusiveZuoraTaxId = findTaxExclusiveProductZuoraTaxId(
		productKey,
		zuoraTaxCodes.taxCodes,
	);
	if (!exclusiveZuoraTaxId) {
		throw new ValidationError(`invalid productKey:${productKey}`);
	}
	const exclusiveZuoraTaxRates = await getZuoraTaxRates(
		zuoraClient,
		exclusiveZuoraTaxId.id,
	);

	if (findCountryZuoraTaxRate(country, exclusiveZuoraTaxRates.taxRates)) {
		const zuoraTaxRate = findStateZuoraTaxRate(
			country,
			state,
			exclusiveZuoraTaxRates.taxRates,
		);
		if (zuoraTaxRate) {
			return { taxRate: zuoraTaxRate.taxRate1 };
		} else {
			throw new ValidationError(`invalid state:${state}`);
		}
	} else {
		throw new ValidationError(`invalid country:${country}`);
	}
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

function findCountryZuoraTaxRate(
	country: IsoCountry,
	zuoraTaxRates: ZuoraTaxRate[],
) {
	return zuoraTaxRates.find((zuoraTaxRate) => zuoraTaxRate.country === country);
}

function findStateZuoraTaxRate(
	country: IsoCountry,
	state: string,
	zuoraTaxRates: ZuoraTaxRate[],
) {
	return zuoraTaxRates.find(
		(zuoraTaxRate) =>
			zuoraTaxRate.country === country && zuoraTaxRate.state === state,
	);
}
