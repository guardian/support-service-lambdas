import {
	supportApisDomain,
	supportCertificateId,
	supportHostedZoneId,
} from '@cdk/module/constants';
import { App } from 'aws-cdk-lib';
import { DiscountApi } from '../lib/discount-api';

const app = new App();

new DiscountApi(app, 'discount-api-CODE', {
	stack: 'support',
	stage: 'CODE',
	domainName: `discount-api-code.${supportApisDomain}`,
	hostedZoneId: supportHostedZoneId,
	certificateId: supportCertificateId,
});
new DiscountApi(app, 'discount-api-PROD', {
	stack: 'support',
	stage: 'PROD',
	domainName: `discount-api.${supportApisDomain}`,
	hostedZoneId: supportHostedZoneId,
	certificateId: supportCertificateId,
});
