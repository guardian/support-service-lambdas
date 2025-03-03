import { getSubscription } from '@modules/zuora/getSubscription';
import { ZuoraClient } from '@modules/zuora/zuoraClient';
import { handler } from '../../src/handlers/getSubStatus';
import { BigQueryRecordSchema } from '../../src/types';
import { mockEvent } from './data/getSubStatus/event';

jest.mock('@modules/zuora/zuoraClient');
jest.mock('@modules/zuora/getSubscription');
describe('getSubStatus handler', () => {
	beforeEach(() => {
		jest.resetAllMocks();
		process.env.Stage = 'CODE';
	});

	it('should return subscription status when event is valid', async () => {
		const mockParsedEvent = BigQueryRecordSchema.parse(mockEvent);
		const mockZuoraClient = { someClientProperty: 'value' };
		const mockGetSubResponse = { status: 'Active' };

		(ZuoraClient.create as jest.Mock).mockResolvedValue(mockZuoraClient);
		(getSubscription as jest.Mock).mockResolvedValue(mockGetSubResponse);

		const result = await handler(mockEvent);

		expect(result).toEqual({
			...mockParsedEvent,
			subStatus: 'Active',
		});
	});

	it('should return error status when an error occurs', async () => {
		const mockError = new Error('Some error');
		(ZuoraClient.create as jest.Mock).mockRejectedValue(mockError);

		const result = await handler(mockEvent);

		expect(result).toEqual({
			...mockEvent,
			subStatus: 'Error',
			errorDetail: 'Some error',
		});
	});
});
