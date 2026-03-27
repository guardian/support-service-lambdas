/// <reference types="node" />

import type { Context } from 'aws-lambda';
import { handler } from '../lambdas/queryZuoraLambda';

process.env.STAGE = process.env.STAGE ?? 'CODE';

const localContext: Context = {
	callbackWaitsForEmptyEventLoop: false,
	functionName: 'local',
	functionVersion: '1',
	invokedFunctionArn: 'arn:local',
	memoryLimitInMB: '1024',
	awsRequestId: 'local',
	logGroupName: '/local',
	logStreamName: 'local',
	getRemainingTimeInMillis: () => 300000,
	done: () => undefined,
	fail: () => undefined,
	succeed: () => undefined,
};

async function main(): Promise<void> {
	const result = await handler(
		{ queryType: 'incremental' },
		localContext,
		() => undefined,
	);
	console.log(JSON.stringify(result, null, 2));
}

void main();
