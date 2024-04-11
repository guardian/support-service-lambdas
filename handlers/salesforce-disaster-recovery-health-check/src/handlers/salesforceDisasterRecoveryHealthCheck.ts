import { checkDefined } from '@modules/nullAndUndefined';
import type { Handler } from 'aws-lambda';
import { SNS, StepFunctions } from 'aws-sdk';

const stepfunctions = new StepFunctions();
const sns = new SNS();

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
		const startExecutionResponse = await stepfunctions
			.startExecution({
				stateMachineArn: stateMachineArn,
				input: input,
				name: executionName,
			})
			.promise();

		const executionArn = startExecutionResponse.executionArn;
		console.log('Execution started:', executionArn);

		let status = 'RUNNING';
		while (status === 'RUNNING') {
			const describeExecutionResponse = await stepfunctions
				.describeExecution({
					executionArn: executionArn,
				})
				.promise();

			status = describeExecutionResponse.status;

			if (status !== 'RUNNING') {
				console.log('Execution result:', describeExecutionResponse);

				if (status === 'SUCCEEDED') return;

				await publishSnsMessage({
					message: JSON.stringify(describeExecutionResponse),
					topicArn: topicArn,
				});
			}
			await new Promise((resolve) => setTimeout(resolve, 5000));
		}
	} catch (error) {
		console.error('Failed to execute state machine:', error);

		await publishSnsMessage({
			message: 'ERROR',
			topicArn: topicArn,
		});
	}
};

const publishSnsMessage = async ({
	message,
	topicArn,
}: {
	message: string;
	topicArn: string;
}) => {
	const params: SNS.PublishInput = {
		Message: message,
		TopicArn: topicArn,
	};
	await sns.publish(params).promise();
};
