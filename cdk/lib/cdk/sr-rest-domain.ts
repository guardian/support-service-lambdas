import { GuCname } from '@guardian/cdk/lib/constructs/dns';
import { Duration } from 'aws-cdk-lib';
import type { LambdaRestApi } from 'aws-cdk-lib/aws-apigateway';
import { CfnBasePathMapping, CfnDomainName } from 'aws-cdk-lib/aws-apigateway';
import { CfnRecordSet } from 'aws-cdk-lib/aws-route53';
import { certForStack } from '../constants';
import type { SrStack } from './sr-stack';

export type SrRestDomainProps = {
	suffixProdDomain?: boolean;
	publicDomain?: boolean; // if setting it to true, you have to add a fastly configuration for it
	domainIdOverride?: string;
};

export function domainForStack(scope: SrStack, suffixProdDomain?: boolean) {
	const isProd = scope.stage === 'PROD';
	const cert = certForStack[scope.stack];
	const domainName = `${scope.app}${isProd && !suffixProdDomain ? '' : '-' + scope.stage.toLowerCase()}.${cert.domainName}`;
	return { cert, domainName };
}

export class SrRestDomain {
	readonly dnsRecord: CfnRecordSet;
	readonly cfnDomainName: CfnDomainName;
	readonly basePathMapping: CfnBasePathMapping;
	readonly domainName: GuCname | undefined;
	constructor(scope: SrStack, api: LambdaRestApi, props?: SrRestDomainProps) {
		const app = scope.app;
		const { cert, domainName } = domainForStack(scope, props?.suffixProdDomain);

		const certificateArn = `arn:aws:acm:eu-west-1:${scope.account}:certificate/${cert.certificateId}`;

		this.cfnDomainName = new CfnDomainName(scope, 'DomainName', {
			domainName,
			regionalCertificateArn: certificateArn,
			endpointConfiguration: {
				types: ['REGIONAL'],
			},
		});

		this.basePathMapping = new CfnBasePathMapping(scope, 'BasePathMapping', {
			domainName: this.cfnDomainName.ref,
			restApiId: api.restApiId,
			stage: api.deploymentStage.stageName,
		});

		this.dnsRecord = new CfnRecordSet(scope, 'DNSRecord', {
			name: domainName,
			type: 'CNAME',
			hostedZoneId: cert.hostedZoneId,
			ttl: '120',
			resourceRecords: [this.cfnDomainName.attrRegionalDomainName],
		});

		if (props?.publicDomain) {
			const domainName =
				app +
				(scope.stage === 'PROD'
					? `.guardianapis.com`
					: `.code.dev-guardianapis.com`);
			this.domainName = new GuCname(
				scope,
				props.domainIdOverride ?? `NS1 DNS entry for ${domainName}`,
				{
					app,
					domainName,
					ttl: Duration.hours(1),
					resourceRecord: 'dualstack.guardian.map.fastly.net',
				},
			);
		}
	}
}
