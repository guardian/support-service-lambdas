import type { DynamoDBStreamEvent } from 'aws-lambda';
import { handler } from '../src/handlers/promoCampaignSync';

describe('promoCampaignSync handler', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should process INSERT event', async () => {
		const event: DynamoDBStreamEvent = {
			Records: [],
		};

		const result = await handler(event);

		expect(result).toBeUndefined();
	});
});
