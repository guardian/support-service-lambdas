import type { GuStack } from '@guardian/cdk/lib/constructs/core';
import type { IRestApi } from 'aws-cdk-lib/aws-apigateway';
import { CfnBasePathMapping, CfnDomainName } from 'aws-cdk-lib/aws-apigateway';
import { CfnRecordSet } from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';

interface GuDomainProps {
    subdomain: string; // e.g. "metric-push-api", "mparticle-api"
    stage: string;
    restApi: IRestApi;
    apiDomain: 'support' | 'membership';
}

function generateSafeId(input: string): string {
    return input
        .split('-')
        .map(
            (word) =>
                word.charAt(0).toUpperCase() + word.slice(1).toLocaleLowerCase(),
        )
        .join('');
}

export class SrLambdaDomain extends Construct {
    constructor(scope: GuStack, props: GuDomainProps) {
        const safeId = generateSafeId(props.subdomain);
        super(scope, `${safeId}Domain`);

        let apiDomain, certificateId;
        switch (props.apiDomain) {
            case "support":
                apiDomain = "support.guardianapis.com";
                certificateId = "b384a6a0-2f54-4874-b99b-96eeff96c009";
                break;
            case "membership":
                apiDomain = "membership.guardianapis.com";
                certificateId = "c1efc564-9ff8-4a03-be48-d1990a3d79d2";
                break;
        }

        const domainNameString = `${props.subdomain}-${props.stage.toLowerCase()}.${apiDomain}`;

        const domainName = new CfnDomainName(this, `${safeId}DomainName`, {
            regionalCertificateArn: `arn:aws:acm:${scope.region}:${scope.account}:certificate/${certificateId}`,
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
            hostedZoneName: `${apiDomain}.`,
            ttl: '120',
            resourceRecords: [domainName.attrRegionalDomainName],
        });
        dnsRecord.overrideLogicalId(`${safeId}DnsRecord`);
    }
}
