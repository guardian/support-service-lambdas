/**
 * @group integration
 */
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { MeEndpoint, staticResponse } from '../src/meEndpoint';

test(
	'helloEndpoint',
	async () => {
		const zuoraClient = await ZuoraClient.create('CODE');

		const testIdentityId = '200372455';
		const result = await new MeEndpoint(zuoraClient).handle(testIdentityId);

		await expect(result).resolves.toEqual({
			statusCode: 200,
			body: JSON.stringify({
				message: staticResponse,
			}),
		});
	},
	15 * 1000,
);
