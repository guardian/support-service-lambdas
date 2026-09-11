import { BrazeClient } from '../clients/brazeClient';
import { getAppConfig } from './getAppConfig';

let brazeClientPromise:
	| Promise<{ client: BrazeClient; appId: string }>
	| undefined;

export const getBrazeClient = async (): Promise<{
	client: BrazeClient;
	appId: string;
}> => {
	brazeClientPromise ??= (async () => {
		const config = await getAppConfig();
		return {
			client: new BrazeClient(config.braze.apiUrl, config.braze.apiKey),
			appId: config.braze.appId,
		};
	})();

	return brazeClientPromise;
};
