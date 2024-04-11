import { checkDefined } from '@modules/nullAndUndefined';
import type { Handler } from 'aws-lambda';
import { publishSnsMessage } from '../services/sns';
import { describeExecution, startExecution } from '../services/step-functions';

export const handler: Handler = async () => {
	const topicArn = checkDefined<string>(
		process.env.SNS_TOPIC_ARN,
		'SNS_TOPIC_ARN environment variable not set',
	);

	const stateMachineArn = checkDefined<string>(
		process.env.STATE_MACHINE_ARN,
		'STATE_MACHINE_ARN environment variable not set',
	);

	const input = JSON.stringify({
		query:
			"SELECT Id, Zuora__Zuora_Id__c, Zuora__Account__c, Contact__c FROM Zuora__CustomerAccount__c WHERE CreatedDate = YESTERDAY AND Zuora__Status__c = 'Active'",
	});

	const dateString = new Date().toISOString().replace(/[:\-.]/g, '');
	const executionName = `health-check-${dateString}`;

	try {
		const startExecutionResponse = await startExecution({
			stateMachineArn,
			input,
			name: executionName,
		});

		const executionArn = startExecutionResponse.executionArn;

		if (executionArn === undefined) {
			throw new Error('Execution ARN is undefined');
		}

		console.log('Execution started:', executionArn);

		let status = 'RUNNING';
		while (status === 'RUNNING') {
			const describeExecutionResponse = await describeExecution({
				executionArn,
			});

			if (describeExecutionResponse.status === undefined) {
				throw new Error('Execution status is undefined');
			}

			status = describeExecutionResponse.status;

			if (status !== 'RUNNING') {
				console.log('Execution result:', describeExecutionResponse);

				if (status === 'SUCCEEDED') return;

				throw new Error(describeExecutionResponse.cause);
			}
			await new Promise((resolve) => setTimeout(resolve, 5000));
		}
	} catch (error) {
		console.error(error);

		await publishSnsMessage({
			message: typeof error === 'string' ? error : JSON.stringify(error),
			topicArn,
		});
	}
};
