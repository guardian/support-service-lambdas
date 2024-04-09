import { checkDefined } from '@modules/nullAndUndefined';
import type { Handler } from 'aws-lambda';
import { StepFunctions } from 'aws-sdk';

const stepfunctions = new StepFunctions();

export const handler: Handler = async (event: unknown) => {
	console.log(`Input is ${JSON.stringify(event)}`);

	const input = JSON.stringify(event);

	const stateMachineArn = checkDefined<string>(
		process.env.STATE_MACHINE_ARN,
		'STATE_MACHINE_ARN environment variable not set',
	);

	try {
		const startExecutionResponse = await stepfunctions
			.startExecution({
				stateMachineArn: stateMachineArn,
				input: input,
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
			}
			await new Promise((resolve) => setTimeout(resolve, 5000));
		}
	} catch (error) {
		console.error('Failed to execute state machine:', error);
	}
};
