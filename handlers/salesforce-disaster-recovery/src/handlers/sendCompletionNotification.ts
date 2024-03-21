import { Anghammarad, RequestedChannel } from '@guardian/anghammarad';
import { checkDefined } from '@modules/nullAndUndefined';

const client = new Anghammarad();

export const handler = async (event: {
	stateMachineExecutionDetailsUrl: string;
	failedRowsFileUrl: string;
	failedRowsCount: number;
}) => {
	const {
		stateMachineExecutionDetailsUrl,
		failedRowsFileUrl,
		failedRowsCount,
	} = event;

	const stack = checkDefined<string>(
		process.env.STACK,
		'STACK environment variable not set',
	);
	const stage = checkDefined<string>(
		process.env.STAGE,
		'STAGE environment variable not set',
	);
	const app = checkDefined<string>(
		process.env.APP,
		'APP environment variable not set',
	);

	const res = await client.notify({
		subject: `Salesforce Disaster Recovery Re-syncing Procedure Completed For ${stage}`,
		message: `Number of accounts that failed to update: ${failedRowsCount}.`,
		actions: [
			{
				url: stateMachineExecutionDetailsUrl,
				cta: 'State machine execution details',
			},
			{
				url: failedRowsFileUrl,
				cta: 'Failed accounts',
			},
		],
		target: {
			Stack: stack,
			Stage: stage,
			App: app,
		},
		channel: RequestedChannel.All,
		sourceSystem: stack,
		topicArn: 'arn:aws:sns:eu-west-1:865473395570:AndreaTest',
	});
	console.log(res);
};
