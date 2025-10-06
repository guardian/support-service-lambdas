import { GuCname } from '@guardian/cdk/lib/constructs/dns';
import { Duration } from 'aws-cdk-lib';
import type { LambdaRestApi } from 'aws-cdk-lib/aws-apigateway';
import { CfnBasePathMapping, CfnDomainName } from 'aws-cdk-lib/aws-apigateway';
import { CfnRecordSet } from 'aws-cdk-lib/aws-route53';
import { certForStack } from '../constants';
import type { SrStack } from './sr-stack';

export class SrRestDomain {
	readonly dnsRecord: CfnRecordSet;
	readonly cfnDomainName: CfnDomainName;
	readonly basePathMapping: CfnBasePathMapping;
	constructor(
		scope: SrStack,
		api: LambdaRestApi,
		suffixProdDomain: boolean = false,
		publicDomain: boolean = false, // if setting it to true, you have to add a fastly configuration for it
	) {
		const app = scope.app;

		const isProd = scope.stage === 'PROD';
		const cert = certForStack[scope.stack];
		// ---- DNS ---- //
		const certificateArn = `arn:aws:acm:eu-west-1:${scope.account}:certificate/${cert.certificateId}`;
		const domainName = `${app}${isProd && !suffixProdDomain ? '' : '-' + scope.stage.toLowerCase()}.${cert.domainName}`;

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

		if (publicDomain) {
			const domainName =
				app +
				(scope.stage === 'PROD'
					? `.guardianapis.com`
					: `.code.dev-guardianapis.com`);
			new GuCname(scope, `NS1 DNS entry for ${domainName}`, {
				app,
				domainName,
				ttl: Duration.hours(1),
				resourceRecord: 'dualstack.guardian.map.fastly.net',
			});
		}
	}
}
