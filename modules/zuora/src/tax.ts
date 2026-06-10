import type { ZuoraTaxCodes, ZuoraTaxRates } from './types/objects/tax';
import { zuoraTaxCodeSchema, zuoraTaxRateSchema } from './types/objects/tax';
import type { ZuoraClient } from './zuoraClient';

export const getZuoraTaxCodes = async (
	zuoraClient: ZuoraClient,
): Promise<ZuoraTaxCodes> => {
	const path = `settings/tax-codes`;
	return zuoraClient.get(path, zuoraTaxCodeSchema);
};

export const getZuoraTaxRates = async (
	zuoraClient: ZuoraClient,
	id: string,
): Promise<ZuoraTaxRates> => {
	const path = `settings/tax-rate-periods/${id}/tax-rates?page=1&size=500`;
	return zuoraClient.get(path, zuoraTaxRateSchema);
};
