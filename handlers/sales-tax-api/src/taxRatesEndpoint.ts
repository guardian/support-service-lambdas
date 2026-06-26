import { ValidationError } from '@modules/errors';
import { logger } from '@modules/logger/logger';
import { buildErrorResponse, ok } from '@modules/routing/apiGatewayResponses';
import type { APIGatewayProxyResult } from 'aws-lambda';
import {
	type TaxRatesRequest,
	type TaxRatesResponse,
	taxRatesResponseSchema,
} from './schemas';

export const cadStates: TaxRatesResponse = {
	AB: 0.05,
	BC: 0.12,
	MB: 0.12,
	NB: 0.15,
	NL: 0.15,
	NT: 0.05,
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
		if (process.env.FORCE_FAILURE === 'true') {
			throw new Error('Forced failure');
		}
		logger.log('Checking sales taxes for', {
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
