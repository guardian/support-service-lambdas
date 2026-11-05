import { isIPv4 } from 'node:net';
import { z } from 'zod';
import { logger } from '@modules/logger/logger';

const fastlyPublicIpListUrl = 'https://api.fastly.com/public-ip-list';

// Fastly also returns `ipv6_addresses`, but the security groups this lambda
// manages only have IPv4 ingress rules, so we only look at `addresses`.
const FastlyIpListSchema = z.object({
	addresses: z.array(z.string()),
});

function isValidIpv4Cidr(value: string): boolean {
	const [address, prefix, ...rest] = value.split('/');
	if (address === undefined || prefix === undefined || rest.length > 0) {
		return false;
	}
	const prefixLength = Number(prefix);
	return (
		isIPv4(address) &&
		Number.isInteger(prefixLength) &&
		prefixLength >= 0 &&
		prefixLength <= 32
	);
}

/**
 * Fetches Fastly's current list of public IPv4 ranges.
 *
 * @see https://developer.fastly.com/reference/api/utils/public-ip-list/
 */
export async function getFastlyIpv4Ranges(): Promise<string[]> {
	const response = await fetch(fastlyPublicIpListUrl);
	const body = await response.text();
	logger.log('fastly public IP list response', {
		status: response.status,
		body,
	});

	if (!response.ok) {
		throw new Error(
			`Failed to fetch Fastly IP ranges: ${response.status} ${body}`,
		);
	}

	const { addresses } = FastlyIpListSchema.parse(JSON.parse(body));
	const validCidrs = addresses.filter((address) => isValidIpv4Cidr(address));

	// Fail loudly rather than revoking every ingress rule on managed security
	// groups: an empty result here (e.g. Fastly returning a malformed or
	// unexpectedly empty list) would otherwise look like "Fastly now has zero
	// IP ranges" to the diffing logic, locking out all traffic.
	if (validCidrs.length === 0) {
		throw new Error(
			`Fastly IP list response contained no valid IPv4 cidrs: ${body}`,
		);
	}

	return validCidrs;
}
