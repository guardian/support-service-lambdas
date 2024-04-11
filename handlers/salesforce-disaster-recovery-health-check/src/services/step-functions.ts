import {
	DescribeExecutionCommand,
	SFNClient,
	StartExecutionCommand,
} from '@aws-sdk/client-sfn';

const sfnClient = new SFNClient({ region: process.env.region });

export const startExecution = async ({
	stateMachineArn,
	input,
	name,
}: {
	stateMachineArn: string;
	input: string;
	name: string;
}) => {
	try {
		const command = new StartExecutionCommand({ stateMachineArn, input, name });

		return await sfnClient.send(command);
	} catch (error) {
		console.log(error);
		throw error;
	}
};

export const describeExecution = async ({
	executionArn,
}: {
	executionArn: string;
}) => {
	try {
		const command = new DescribeExecutionCommand({ executionArn });

		return await sfnClient.send(command);
	} catch (error) {
		console.log(error);
		throw error;
	}
};
