import type { GuApiLambda } from '@guardian/cdk';
import { CfnBasePathMapping, CfnDomainName } from 'aws-cdk-lib/aws-apigateway';
import { CfnRecordSet } from 'aws-cdk-lib/aws-route53';
import { certForStack } from '../constants';
import type { SrStack } from './sr-stack';

export class SrRestDomain {
	constructor(scope: SrStack, lambda: GuApiLambda) {
		const app = scope.app;

		const isProd = scope.stage === 'PROD';
		const cert = certForStack[scope.stack];
		// ---- DNS ---- //
		const certificateArn = `arn:aws:acm:eu-west-1:${scope.account}:certificate/${cert.certificateId}`;
		const domainName = `${app}${isProd ? '' : '-code'}.${cert.domainName}`;

		const cfnDomainName = new CfnDomainName(scope, 'DomainName', {
			domainName,
			regionalCertificateArn: certificateArn,
			endpointConfiguration: {
				types: ['REGIONAL'],
			},
		});

		new CfnBasePathMapping(scope, 'BasePathMapping', {
			domainName: cfnDomainName.ref,
			restApiId: lambda.api.restApiId,
			stage: lambda.api.deploymentStage.stageName,
		});

		new CfnRecordSet(scope, 'DNSRecord', {
			name: domainName,
			type: 'CNAME',
			hostedZoneId: cert.hostedZoneId,
			ttl: '120',
			resourceRecords: [cfnDomainName.attrRegionalDomainName],
		});
	}
}
