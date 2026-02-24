import { getIfDefined } from '@modules/nullAndUndefined';
import { logger } from '@modules/routing/logger';
import { buildDiagnosticLinks } from './buildDiagnosticLinks';
import { buildAlarmUrl, buildRow, buildText } from './buildRow';
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
	const alarmName = getIfDefined(AlarmName, 'missing alarm name');
	const alarmUrl = buildAlarmUrl(alarmName);

	const stateText =
		NewStateValue === 'OK'
			? `✅ <a href="${alarmUrl}">Alarm</a> OK: Alarm has recovered!`
			: `🚨 <a href="${alarmUrl}">Alarm</a> has triggered!`;

	const widgets = [
		buildText(stateText),
		buildRow('<b>Reason</b>', NewStateReason, 'right'),
		...links.map(({ link, linkText }) => {
			return buildText(`<a href="${link}">${linkText}</a>`);
		}),
		buildText(AlarmDescription ?? ''),
	];

	logger.log(`CloudWatch alarm from ${App}`, stateText);

	return {
		app: App,
		body: {
			text: alarmName,
			cardsV2: [
				{
					cardId: 'cloudwatch-alarm',
					card: {
						header: { title: alarmName },
						sections: [{ widgets }],
					},
				},
			],
		},
	};
};
