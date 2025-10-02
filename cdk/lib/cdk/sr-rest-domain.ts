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
	}
}
