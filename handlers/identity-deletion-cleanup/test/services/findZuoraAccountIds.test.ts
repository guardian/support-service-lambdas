import { findZuoraAccountIds } from '../../src/services/findZuoraAccountIds';

describe('findZuoraAccountIds', () => {
	const get = jest.fn<
		Promise<unknown>,
		[path: string, schema: unknown, query: URLSearchParams]
	>();
	const zuoraClient = { get } as never;

	beforeEach(() => {
		jest.resetAllMocks();
	});

	it('finds every page of matching Customer Accounts', async () => {
		const queries: URLSearchParams[] = [];
		const pages = [
			{ nextPage: 'next-page', data: [{ id: 'account-1' }] },
			{ nextPage: null, data: [{ id: 'account-2' }] },
		];
		get.mockImplementation(
			(_path: string, _schema: unknown, query: URLSearchParams) => {
				queries.push(query);
				return Promise.resolve(pages.shift());
			},
		);

		await expect(
			findZuoraAccountIds(zuoraClient, 'deleted-identity-id'),
		).resolves.toEqual(['account-1', 'account-2']);

		expect(get).toHaveBeenNthCalledWith(
			1,
			'/object-query/accounts',
			expect.anything(),
			expect.any(URLSearchParams),
		);
		expect(queries[0]?.toString()).toBe(
			'pageSize=99&fields%5B%5D=id&filter%5B%5D=IdentityId__c.EQ%3Adeleted-identity-id&includeNullFields=true',
		);
		expect(queries[1]?.get('cursor')).toBe('next-page');
	});

	it('fails rather than loop forever when Zuora repeats a page cursor', async () => {
		get.mockResolvedValue({
			nextPage: 'repeated-page',
			data: [],
		});

		await expect(
			findZuoraAccountIds(zuoraClient, 'deleted-identity-id'),
		).rejects.toThrow('Zuora account query returned a repeated page cursor');
	});
});
