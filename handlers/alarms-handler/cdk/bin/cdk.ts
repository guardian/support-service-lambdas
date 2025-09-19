import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { AlarmsHandler } from '../lib/alarms-handler';

const app = new App();

new AlarmsHandler(app, 'alarms-handler-CODE', {
	stack: 'support',
	stage: 'CODE',
});
new AlarmsHandler(app, 'alarms-handler-PROD', {
	stack: 'support',
	stage: 'PROD',
});
