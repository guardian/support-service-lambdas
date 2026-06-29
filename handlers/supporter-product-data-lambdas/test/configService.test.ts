import { ConfigService } from '../src/services/configService';

describe('ConfigService', () => {
	test('loads config from the same SSM path pattern as Scala service', async () => {
		const send = jest.fn().mockResolvedValue({
			Parameter: {
				Name: '/supporter-product-data/CODE/zuora-config/partnerId',
				Value: 'partner',
			},
		});

		const service = new ConfigService('CODE', { send } as never);
		const partnerId = await service.getPartnerId();

		expect(send).toHaveBeenCalledTimes(1);
		expect(partnerId).toBe('partner');
	});
});
