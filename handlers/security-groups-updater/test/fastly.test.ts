import fetchMock from 'fetch-mock';
import { getFastlyIpv4Ranges } from '../src/fastly';

const fastlyUrl = 'https://api.fastly.com/public-ip-list';

// 10 valid CIDRs - enough to clear the minExpectedCidrs minimum in
// fastly.ts for tests that aren't specifically exercising that minimum.
const manyValidCidrs = [
	'23.235.32.0/20',
	'43.249.72.0/22',
	'90.98.0.0/17',
	'90.98.128.0/18',
	'103.244.50.0/24',
	'103.245.222.0/23',
	'103.245.224.0/24',
	'104.156.80.0/20',
	'140.248.64.0/18',
	'140.248.128.0/17',
];

beforeEach(() => {
	fetchMock.restore();
});

test('returns the valid IPv4 cidrs from the addresses field', async () => {
	fetchMock.mock(
		fastlyUrl,
		new Response(
			JSON.stringify({
				addresses: manyValidCidrs,
				ipv6_addresses: ['2a04:4e40::/32'],
			}),
		),
	);

	const result = await getFastlyIpv4Ranges();

	expect(result).toEqual(manyValidCidrs);
});

test('throws if there is a malformed entry, rather than silently dropping it', async () => {
	fetchMock.mock(
		fastlyUrl,
		new Response(
			JSON.stringify({
				addresses: [...manyValidCidrs, 'not-a-cidr'],
			}),
		),
	);

	await expect(getFastlyIpv4Ranges()).rejects.toThrow('Invalid IPv4 range');
});

test('throws if there is a cidr with an out-of-range octet or prefix length', async () => {
	fetchMock.mock(
		fastlyUrl,
		new Response(
			JSON.stringify({
				addresses: [...manyValidCidrs, '999.101.0.0/16'],
			}),
		),
	);

	await expect(getFastlyIpv4Ranges()).rejects.toThrow('Invalid IPv4 range');
});

test('throws if the request is not successful', async () => {
	fetchMock.mock(fastlyUrl, new Response('oops', { status: 500 }));

	await expect(getFastlyIpv4Ranges()).rejects.toThrow(
		'Failed to fetch Fastly IP ranges: 500 oops',
	);
});

test('throws if there are no valid IPv4 cidrs, rather than returning an empty list', async () => {
	fetchMock.mock(
		fastlyUrl,
		new Response(
			JSON.stringify({
				addresses: [],
				ipv6_addresses: ['2a04:4e40::/32'],
			}),
		),
	);

	await expect(getFastlyIpv4Ranges()).rejects.toThrow(
		'Fastly IP list response contained too few valid IPv4 cidrs (0, expected at least 10)',
	);
});

test('throws if there are fewer valid IPv4 cidrs than the minimum expected number, rather than applying a partial list', async () => {
	fetchMock.mock(
		fastlyUrl,
		new Response(
			JSON.stringify({
				addresses: ['151.101.0.0/16', '199.27.72.0/21'],
			}),
		),
	);

	await expect(getFastlyIpv4Ranges()).rejects.toThrow(
		'Fastly IP list response contained too few valid IPv4 cidrs (2, expected at least 10)',
	);
});
