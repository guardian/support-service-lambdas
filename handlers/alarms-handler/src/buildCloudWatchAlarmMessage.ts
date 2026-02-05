import { logger } from '@modules/routing/logger';
import dayjs from 'dayjs';
import { buildDiagnosticLinks } from './buildDiagnosticLinks';
import type { Tags } from './cloudwatch/getTags';
import type { CloudWatchAlarmMessage } from './index';

export const buildCloudWatchAlarmMessage = async (
	{
		AlarmArn,
		AlarmName,
		NewStateReason,
		NewStateValue,
		AlarmDescription,
		AWSAccountId,
		StateChangeTime,
		Trigger,
	}: CloudWatchAlarmMessage,
	getTags: (alarmArn: string, awsAccountId: string) => Promise<Tags>,
) => {
	const { App, DiagnosticLinks } = await getTags(AlarmArn, AWSAccountId);

	const links = buildDiagnosticLinks(DiagnosticLinks, Trigger, StateChangeTime);

	const stateText =
		NewStateValue === 'OK'
			? '✅ ALARM OK: Alarm has recovered!'
			: '🚨 ALARM: Alarm has triggered!';

	const widgets = [
		{
			textParagraph: {
				text: stateText,
			},
		},
		buildRow('<b>Reason</b>', NewStateReason),
		...links.map(({ link, lambda }) => {
			const linkText = buildLinkText(lambda, Trigger, StateChangeTime);
			return {
				textParagraph: {
					text: `<a href="${link}">${linkText}</a>`,
				},
			};
		}),
		{
			textParagraph: {
				text: AlarmDescription ?? '',
			},
		},
	];

	logger.log(`CloudWatch alarm from ${App}`, stateText);

	return {
		app: App,
		body: {
			cardsV2: [
				{
					cardId: 'cloudwatch-alarm',
					card: {
						header: { title: AlarmName },
						sections: [{ widgets }],
					},
				},
			],
		},
	};
};

function buildLinkText(
	lambdaName: string,
	trigger: { Period: number; EvaluationPeriods: number } | undefined,
	stateChangeTime: Date,
): string {
	const assumedTimeForCompositeAlarms = 300;
	const extraTimeForPropagation = 60;
	const alarmCoveredTimeSeconds = trigger
		? trigger.EvaluationPeriods * trigger.Period
		: assumedTimeForCompositeAlarms;

	const alarmEndTimeMillis = new Date(stateChangeTime.getTime()).setSeconds(
		0,
		0,
	);
	const alarmStartTimeMillis =
		alarmEndTimeMillis -
		1000 * (alarmCoveredTimeSeconds + extraTimeForPropagation);

	const startDate = dayjs(new Date(alarmStartTimeMillis)).format('HH:mm');
	const endDate = dayjs(alarmEndTimeMillis).format('HH:mm');

	return `Logs for ${lambdaName} between ${startDate} and ${endDate}`;
}

function buildRow(label: string, value: string) {
	return {
		columns: {
			columnItems: [
				{
					horizontalSizeStyle: 'FILL_MINIMUM_SPACE',
					widgets: [{ textParagraph: { text: label } }],
				},
				{
					horizontalSizeStyle: 'FILL_AVAILABLE_SPACE',
					widgets: [{ textParagraph: { text: value } }],
				},
			],
		},
	};
}
