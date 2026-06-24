import {
	zuoraTaxCodesSchema,
	zuoraTaxPeriodsSchema,
	zuoraTaxRatesSchema,
} from './types/objects/tax';
import type { ZuoraClient } from './zuoraClient';

export const getZuoraTaxCodes = async (zuoraClient: ZuoraClient) => {
	const path = `settings/tax-codes`;
	return zuoraClient.get(path, zuoraTaxCodesSchema);
};

export const getZuoraTaxPeriods = async (zuoraClient: ZuoraClient) => {
	const path = `settings/tax-rate-periods`;
	return zuoraClient.get(path, zuoraTaxPeriodsSchema);
};

export const getZuoraTaxRates = async (
	zuoraClient: ZuoraClient,
	id: string,
) => {
	const path = `settings/tax-rate-periods/${id}/tax-rates?page=1&size=500`;
	return zuoraClient.get(path, zuoraTaxRatesSchema);
};
