import type { GuStack } from '@guardian/cdk/lib/constructs/core';
import type { IRestApi } from 'aws-cdk-lib/aws-apigateway';
import { CfnBasePathMapping, CfnDomainName } from 'aws-cdk-lib/aws-apigateway';
import { CfnRecordSet } from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';
import { membershipApisDomain, membershipCertificateId, supportApisDomain, supportCertificateId } from '../../bin/cdk';

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
                apiDomain = supportApisDomain;
                certificateId = supportCertificateId;
                break;
            case "membership":
                apiDomain = membershipApisDomain;
                certificateId = membershipCertificateId;
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
