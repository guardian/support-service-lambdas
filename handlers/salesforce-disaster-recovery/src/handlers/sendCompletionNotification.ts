import { Anghammarad, RequestedChannel } from '@guardian/anghammarad';
import { checkDefined } from '@modules/nullAndUndefined';

const client = new Anghammarad();

export const handler = async (event: unknown) => {
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

	console.log(event);
	client.notify({
		subject: 'Salesforce Disaster Recovery Re-syncing Procedure Completed',
		message:
			"Hi there, something has happened which we'd like to tell you about",
		actions: [{ url: 'https://example.com', cta: 'Test cta' }],
		target: {
			Stack: stack,
			Stage: stage,
			App: app,
		},
		channel: RequestedChannel.Email,
		sourceSystem: stack,
		topicArn: 'AndreaTest',
	});

	await Promise.resolve();
};
