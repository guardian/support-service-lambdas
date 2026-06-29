import { groupMap } from '@modules/arrayFunctions';
import { mockZuoraClient } from '../../../modules/zuora/test/mocks/mockZuoraClient';
import largeAccountResponse from '../../../modules/zuora/test/objectQuery/largeAccountResponse.json';
import { MeEndpoint } from '../src/meEndpoint';

test('me static endpoint', async () => {
	mockZuoraClient.get = jest.fn().mockResolvedValueOnce(largeAccountResponse);
	const testIdentityId = '123';
	const result = await new MeEndpoint(mockZuoraClient).handle(testIdentityId);

	expect(result.statusCode).toEqual(200);

	const [path, , params] = mockZuoraClient.get.mock.calls[0] as [
		string,
		unknown,
		URLSearchParams,
	];
	expect(path).toEqual('/object-query/accounts');
	const paramsObject = groupMap(
		[...params.entries()],
		([key]) => key,
		([, value]) => value,
	);
	expect(paramsObject).toEqual({
		pageSize: ['99'],
		'fields[]': ['id', 'name', 'accountNumber', 'balance'],
		'expand[]': ['subscriptions.rateplans'],
		'filter[]': ['IdentityId__c.EQ:123'],
		includeNullFields: ['true'],
	});
});
