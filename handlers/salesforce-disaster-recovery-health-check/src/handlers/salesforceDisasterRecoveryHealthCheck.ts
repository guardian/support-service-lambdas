import { checkDefined } from '@modules/nullAndUndefined';
import { publishSnsMessage } from '../services/sns';
import { describeExecution, startExecution } from '../services/step-functions';

export const handler = async (): Promise<
	'HEALTH CHECK PASSED' | 'HEALTH CHECK FAILED'
> => {
	const stage = checkDefined<string>(
		process.env.STAGE,
		'STAGE environment variable not set',
	);

	const region = checkDefined<string>(
		process.env.REGION,
		'REGION environment variable not set',
	);

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

		const executionArn = checkDefined<string>(
			startExecutionResponse.executionArn,
			'Execution ARN is undefined',
		);

		console.log('Execution started:', executionArn);

		let status = 'RUNNING';
		while (status === 'RUNNING') {
			const describeExecutionResponse = await describeExecution({
				executionArn,
			});

			status = checkDefined<string>(
				describeExecutionResponse.status,
				'Execution status is undefined',
			);

			if (status !== 'RUNNING') {
				console.log('Execution result:', describeExecutionResponse);

				if (status === 'SUCCEEDED') return 'HEALTH CHECK PASSED';

				await publishSnsMessage({
					topicArn,
					subject: `Health Check Failed For ${stage} Salesforce Disaster Recovery State Machine`,
					message: `Execution details:\nhttps://${region}.console.aws.amazon.com/states/home?region=${region}#/executions/details/${executionArn}`,
				});

				return 'HEALTH CHECK FAILED';
			}
			await new Promise((resolve) => setTimeout(resolve, 5000));
		}
		return 'HEALTH CHECK PASSED';
	} catch (error) {
		console.error(error);

		await publishSnsMessage({
			subject: `Health Check Failed For ${stage} Salesforce Disaster Recovery State Machine`,
			message: typeof error === 'string' ? error : JSON.stringify(error),
			topicArn,
		});

		return 'HEALTH CHECK FAILED';
	}
};
