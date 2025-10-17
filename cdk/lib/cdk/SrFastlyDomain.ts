import { GuCname } from '@guardian/cdk/lib/constructs/dns';
import type { SrStack } from './SrStack';
import { Duration } from 'aws-cdk-lib';

type SrFastlyDomainProps = {
	prefixOverride?: string;
};

/**
 * Represents the CNAME record pointing to fastly.
 *
 * Note: you also need to set up suitable services in fastly, and point them at the internal domain name/s3 buckets,
 * this is not currently possible with CDK
 */
export class SrFastlyDomain extends GuCname {
	constructor(scope: SrStack, id: string, props?: SrFastlyDomainProps) {
		const domainName =
			(props?.prefixOverride ?? scope.app) +
			(scope.stage === 'PROD'
				? `.guardianapis.com`
				: `.code.dev-guardianapis.com`);
		super(scope, id, {
			app: scope.app,
			domainName,
			ttl: Duration.hours(1),
			resourceRecord: 'dualstack.guardian.map.fastly.net',
		});
	}
}
