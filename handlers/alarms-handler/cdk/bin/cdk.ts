import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { AlarmsHandler } from '../lib/alarms-handler';

const app = new App();
export const supportHostedZoneId = 'Z3KO35ELNWZMSX';
export const supportCertificateId = 'b384a6a0-2f54-4874-b99b-96eeff96c009';
export const supportApisDomain = 'support.guardianapis.com';

new AlarmsHandler(app, 'alarms-handler-CODE', {
	stack: 'support',
	stage: 'CODE',
});
new AlarmsHandler(app, 'alarms-handler-PROD', {
	stack: 'support',
	stage: 'PROD',
});
