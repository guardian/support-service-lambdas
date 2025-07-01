import type { GuStack } from '@guardian/cdk/lib/constructs/core';
import type { IRestApi } from 'aws-cdk-lib/aws-apigateway';
import { CfnBasePathMapping, CfnDomainName } from 'aws-cdk-lib/aws-apigateway';
import { CfnRecordSet } from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';

interface GuDomainProps {
    subdomain: string; // e.g. "metric-push-api", "mparticle-api"
    stage: string;
    restApi: IRestApi;
}

function generateSafeId(input: string): string {
  return input
    .split('-')
    .map((word) => 
      word.charAt(0).toUpperCase() + word.slice(1).toLocaleLowerCase()
    )
    .join('');
}

export class SrLambdaDomain extends Construct {
    constructor(scope: GuStack, props: GuDomainProps) {
        const safeId = generateSafeId(props.subdomain);
        super(scope, `${safeId}Domain`);
        const domainNameString = `${props.subdomain}-${props.stage.toLowerCase()}.support.guardianapis.com`;

        const domainName = new CfnDomainName(this, `${safeId}DomainName`, {
            regionalCertificateArn: `arn:aws:acm:${scope.region}:${scope.account}:certificate/b384a6a0-2f54-4874-b99b-96eeff96c009`,
            domainName: domainNameString,
            endpointConfiguration: { types: ['REGIONAL'] },
        });

        new CfnBasePathMapping(this, `${safeId}BasePathMapping`, {
            restApiId: props.restApi.restApiId,
            domainName: domainName.ref,
            stage: props.restApi.deploymentStage.stageName,
        });

        const dnsRecord = new CfnRecordSet(this, `${safeId}DnsRecord`, {
            name: domainNameString,
            type: 'CNAME',
            comment: `CNAME for ${props.subdomain} API ${props.stage}`,
            hostedZoneName: 'support.guardianapis.com',
            ttl: '120',
            resourceRecords: [domainName.attrRegionalDomainName],
        });
        dnsRecord.overrideLogicalId(`${safeId}DnsRecord`);
    }
}