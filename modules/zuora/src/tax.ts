import type { z } from 'zod';
import {
	zuoraTaxCodeSchema,
	zuoraTaxPeriodsSchema,
	zuoraTaxRateSchema,
} from './types/objects/tax';
import type { ZuoraClient } from './zuoraClient';

export const getZuoraTaxCodes = async <
	T extends z.ZodType = typeof zuoraTaxCodeSchema,
>(
	zuoraClient: ZuoraClient,
): Promise<z.infer<T>> => {
	const path = `settings/tax-codes`;
	return zuoraClient.get(path, zuoraTaxCodeSchema);
};

export const getZuoraTaxPeriods = async <
	T extends z.ZodType = typeof zuoraTaxPeriodsSchema,
>(
	zuoraClient: ZuoraClient,
): Promise<z.infer<T>> => {
	const path = `settings/tax-rate-periods`;
	return zuoraClient.get(path, zuoraTaxPeriodsSchema);
};

export const getZuoraTaxRates = async <
	T extends z.ZodType = typeof zuoraTaxRateSchema,
>(
	zuoraClient: ZuoraClient,
	id: string,
): Promise<z.infer<T>> => {
	const path = `settings/tax-rate-periods/${id}/tax-rates?page=1&size=500`;
	return zuoraClient.get(path, zuoraTaxRateSchema);
};
