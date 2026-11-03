import { z } from 'zod';
import { logger } from '@modules/logger/logger';

const fastlyPublicIpListUrl = 'https://api.fastly.com/public-ip-list';

// Fastly also returns `ipv6_addresses`, but the security groups this lambda
// manages only have IPv4 ingress rules, so we only look at `addresses`.
const FastlyIpListSchema = z.object({
	addresses: z.array(z.string()),
});

const ipv4CidrPattern = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/;

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
	return addresses.filter((address) => ipv4CidrPattern.test(address));
}
