import { buildDynamoItem } from '../src/index';

describe('buildDynamoItem', () => {
	it('builds the correct DynamoDB item with composite sort key', () => {
		const result = buildDynamoItem({
			userId: '115266618',
			newsletterId: 'film-today',
			timestamp: '2026-03-21T10:00:00.000Z',
		});

		expect(result).toEqual({
			userId: '115266618',
			sortKey: '2026-03-21T10:00:00.000Z#film-today',
			newsletterId: 'film-today',
			timestamp: '2026-03-21T10:00:00.000Z',
		});
	});
});
