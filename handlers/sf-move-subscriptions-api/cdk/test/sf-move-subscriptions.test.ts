import { expect as expectCDK, haveResource } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import Cdk = require('../lib/sf-move-subscriptions-stack');

test('lambda with Rest API gateway Created', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new Cdk.SfMoveSubscriptionsStack(app, 'sf-move-subscriptions-api')
    // THEN
    expectCDK(stack).to(haveResource("AWS::IAM::Role"))
    expectCDK(stack).to(haveResource("AWS::Lambda::Function"))
    expectCDK(stack).to(haveResource("AWS::ApiGateway::RestApi"))
});
