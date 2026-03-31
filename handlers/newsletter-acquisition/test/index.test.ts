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

	it('preserves extra fields from the message', () => {
		const result = buildDynamoItem({
			userId: '115256905',
			newsletterId: 'fighting-back',
			timestamp: '2026-03-19T23:55:35.233Z',
			browserId: 'idFromPV_HfFRtIE7poC_Yxsn8vSoNw',
			refViewId: 'mmy4i9id6zhr6wmir4ve',
		});

		expect(result).toEqual({
			userId: '115256905',
			sortKey: '2026-03-19T23:55:35.233Z#fighting-back',
			newsletterId: 'fighting-back',
			timestamp: '2026-03-19T23:55:35.233Z',
			browserId: 'idFromPV_HfFRtIE7poC_Yxsn8vSoNw',
			refViewId: 'mmy4i9id6zhr6wmir4ve',
		});
	});
});
