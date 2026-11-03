import fetchMock from 'fetch-mock';
import { getFastlyIpv4Ranges } from '../src/fastly';

const fastlyUrl = 'https://api.fastly.com/public-ip-list';

beforeEach(() => {
	fetchMock.restore();
});

test('returns only valid IPv4 cidrs from the addresses field', async () => {
	fetchMock.mock(
		fastlyUrl,
		new Response(
			JSON.stringify({
				addresses: ['151.101.0.0/16', '199.27.72.0/21'],
				ipv6_addresses: ['2a04:4e40::/32'],
			}),
		),
	);

	const result = await getFastlyIpv4Ranges();

	expect(result).toEqual(['151.101.0.0/16', '199.27.72.0/21']);
});

test('filters out malformed entries', async () => {
	fetchMock.mock(
		fastlyUrl,
		new Response(
			JSON.stringify({
				addresses: ['151.101.0.0/16', 'not-a-cidr', '10.0.0.1'],
			}),
		),
	);

	const result = await getFastlyIpv4Ranges();

	expect(result).toEqual(['151.101.0.0/16']);
});

test('throws if the request is not successful', async () => {
	fetchMock.mock(fastlyUrl, new Response('oops', { status: 500 }));

	await expect(getFastlyIpv4Ranges()).rejects.toThrow(
		'Failed to fetch Fastly IP ranges: 500 oops',
	);
});
