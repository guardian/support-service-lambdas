import { z } from 'zod';
import { logger } from '@modules/logger/logger';

const fastlyPublicIpListUrl = 'https://api.fastly.com/public-ip-list';

// Fastly's IPv4 list currently has ~21 ranges. This is a minimum expected
// number, well below that, to catch a badly truncated/partial response
// (which wouldn't otherwise look like an error).
const minExpectedCidrs = 10;

// Fastly also returns `ipv6_addresses`, but the security groups this lambda
// manages only have IPv4 ingress rules, so we only look at `addresses`.
//
// Any entry that isn't a valid IPv4 cidr fails this parse and throws,
// rather than being silently filtered out - a malformed entry in Fastly's
// response is itself worth investigating, and this reuses the lambda's
// existing error alarm rather than requiring a separate log-based alarm.
const FastlyIpListSchema = z.object({
	addresses: z.array(z.cidrv4()),
});

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

	// Fail loudly rather than revoking ingress rules based on a
	// truncated response (e.g. Fastly returning an empty or partial list) -
	// this would otherwise look like a legitimate shrink in Fastly's range
	// count to the diffing logic, locking out some or all traffic.
	if (addresses.length < minExpectedCidrs) {
		throw new Error(
			`Fastly IP list response contained too few valid IPv4 cidrs (${addresses.length}, expected at least ${minExpectedCidrs}): ${body}`,
		);
	}

	return addresses;
}
