import type { HandlerEnv } from '@modules/routing/lambdaHandler';
import { logger } from '@modules/routing/logger';
import { SQSHandler } from '@modules/routing/sqsHandler';
import type { SNSEventRecord, SQSRecord } from 'aws-lambda';
import { z } from 'zod';
import type { AppToTeams } from './alarmMappings';
import { prodAppToTeams } from './alarmMappings';
import { buildCloudWatchAlarmMessage } from './buildCloudWatchAlarmMessage';
import { buildCloudwatch } from './cloudwatch';
import type { Tags } from './cloudwatch/getTags';
import type { WebhookUrls } from './configSchema';
import { ConfigSchema } from './configSchema';

const cloudWatchAlarmMessageSchema = z.object({
	AlarmArn: z.string(),
	AlarmName: z.string(),
	AlarmDescription: z.string().nullish(),
	NewStateReason: z.string(),
	NewStateValue: z.string(),
	AWSAccountId: z.string(),
	StateChangeTime: z.coerce.date(),
	Trigger: z
		.object({
			Period: z.number(),
			EvaluationPeriods: z.number(),
		})
		.optional(),
});

export type CloudWatchAlarmMessage = z.infer<
	typeof cloudWatchAlarmMessageSchema
>;

export type Services = {
	webhookUrls: WebhookUrls;
	getTags: (alarmArn: string, awsAccountId: string) => Promise<Tags>;
};

// called by AWS
export const handler = SQSHandler(
	ConfigSchema,
	handlerWithStage,
	buildServices,
);

// runs on cold start only
function buildServices({ config }: HandlerEnv<ConfigSchema>) {
	return {
		webhookUrls: config.webhookUrls,
		getTags: buildCloudwatch(config.accounts).getTags,
	};
}

// runs for every record
export async function handlerWithStage(record: SQSRecord, services: Services) {
	const maybeChatMessages = await getChatMessages(
		record.body,
		prodAppToTeams,
		services.getTags,
		services.webhookUrls,
	);

	if (maybeChatMessages) {
		await Promise.all(
			maybeChatMessages.webhookUrls.map((webhookUrl) => {
				logger.log('sending message to web hook', webhookUrl);
				return fetch(webhookUrl, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(maybeChatMessages.body),
				});
			}),
		);
	}
}

export async function getChatMessages(
	body: string,
	appToTeams: AppToTeams,
	getTags: (alarmArn: string, awsAccountId: string) => Promise<Tags>,
	configuredWebhookUrls: WebhookUrls,
): Promise<{ webhookUrls: string[]; body: object } | undefined> {
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- todo fix in next refactor
	const { Message, MessageAttributes } = JSON.parse(
		body,
	) as SNSEventRecord['Sns'];

	logger.log('snsEvent', Message, MessageAttributes);

	const parsedMessage = attemptToParseMessageString({
		messageString: Message,
	});

	logger.log('parsedMessage', parsedMessage);

	let message;
	if (parsedMessage) {
		message = await buildCloudWatchAlarmMessage(parsedMessage, getTags);
	} else {
		message = buildSnsPublishMessage({
			message: Message,
			messageAttributes: MessageAttributes,
		});
	}

	if (message) {
		const teams = appToTeams(message.app);
		console.log(`app ${message.app} is assigned to teams ${teams.join(', ')}`);
		const webhookUrls = teams.map((team) => configuredWebhookUrls[team]);
		return { webhookUrls, body: message.body };
	} else {
		return undefined;
	}
}

const attemptToParseMessageString = ({
	messageString,
}: {
	messageString: string;
}): CloudWatchAlarmMessage | null => {
	try {
		return cloudWatchAlarmMessageSchema.parse(JSON.parse(messageString));
	} catch (error) {
		console.error(error);
		return null;
	}
};

const buildSnsPublishMessage = ({
	message,
	messageAttributes,
}: {
	message: string;
	messageAttributes: SNSEventRecord['Sns']['MessageAttributes'];
}) => {
	const stage = messageAttributes.stage?.Value;

	if (stage && stage !== 'PROD') {
		return;
	}

	const app = messageAttributes.app?.Value;

	console.log(`SNS publish message from ${app}`);

	return { app, body: { text: message } };
};
