import { ConfigService } from '../src/services/configService';

describe('ConfigService', () => {
	test('loads config from the same SSM path pattern as Scala service', async () => {
		const send = jest.fn().mockResolvedValue({
			Parameters: [
				{
					Name: '/supporter-product-data/CODE/zuora-config/partnerId',
					Value: 'partner',
				},
			],
		});

		const service = new ConfigService('CODE', { send } as never);
		const config = await service.loadZuoraConfig();

		expect(send).toHaveBeenCalledTimes(1);
		expect(config.partnerId).toBe('partner');
		expect(config.discountProductRatePlanIds).toEqual([
			'2c92c0f852f2ebb20152f9269f067819',
		]);
	});
});
