import type { MetricAlarm } from '@aws-sdk/client-cloudwatch';
import { getIfDefined } from '@modules/nullAndUndefined';
import dayjs from 'dayjs';
import { buildDiagnosticLinks } from './buildDiagnosticLinks';

export const buildStuckInAlarmMessage = (
	alarms: Array<{
		alarm: MetricAlarm;
		diagnosticLinks: string | undefined;
	}>,
) => {
	const allWidgets = alarms.flatMap(({ alarm, diagnosticLinks }) => {
		const links = getDiagnosticLinks(diagnosticLinks, alarm);

		const alarmUrl = alarm.AlarmName
			? 'https://console.aws.amazon.com/cloudwatch/home?region=eu-west-1#alarmsV2:alarm/' +
				encodeURIComponent(alarm.AlarmName).replaceAll('.', '%2E')
			: undefined;

		const widgets = [
			{ divider: {} },
			{
				textParagraph: {
					text: `<b>🚨 ${alarm.AlarmName}</b>`,
				},
			},
			buildRow(
				`<a href="${alarmUrl}">View alarm in CloudWatch</a>`,
				`In alarm since ${dayjs(alarm.StateTransitionedTimestamp).format('YYYY-MM-DD HH:mm')}`,
			),
			...links.map(({ link, lambda }) => {
				const linkText = buildLinkText(lambda, alarm);
				return buildRow('<b>Log Link</b>', `<a href="${link}">${linkText}</a>`);
			}),
			{
				textParagraph: {
					text: alarm.AlarmDescription ?? '',
				},
			},
		];

		return widgets;
	});

	return {
		cardsV2: [
			{
				cardId: 'stuck-alarms',
				card: {
					header: {
						title: 'These alarms have been going off for more than 24h',
					},
					sections: [{ widgets: allWidgets }],
				},
			},
		],
	};
};

function buildLinkText(lambdaName: string, alarm: MetricAlarm): string {
	const { Period, EvaluationPeriods } = alarm;
	const trigger =
		Period && EvaluationPeriods ? { Period, EvaluationPeriods } : undefined;

	const assumedTimeForCompositeAlarms = 300;
	const extraTimeForPropagation = 60;
	const alarmCoveredTimeSeconds = trigger
		? trigger.EvaluationPeriods * trigger.Period
		: assumedTimeForCompositeAlarms;

	const stateChangeTime = getIfDefined(
		alarm.StateTransitionedTimestamp,
		'no transition timestamp',
	);
	const alarmEndTimeMillis = new Date(stateChangeTime.getTime()).setSeconds(
		0,
		0,
	);
	const alarmStartTimeMillis =
		alarmEndTimeMillis -
		1000 * (alarmCoveredTimeSeconds + extraTimeForPropagation);

	const startDate = dayjs(new Date(alarmStartTimeMillis)).format('HH:mm');
	const endDate = dayjs(alarmEndTimeMillis).format('HH:mm');

	return `view ${lambdaName} events from ${startDate} to ${endDate}`;
}

function getDiagnosticLinks(
	DiagnosticLinks: string | undefined,
	alarm: MetricAlarm,
) {
	const { Period, EvaluationPeriods } = alarm;
	const trigger =
		Period && EvaluationPeriods ? { Period, EvaluationPeriods } : undefined;
	const stateChangeTime = getIfDefined(
		alarm.StateTransitionedTimestamp,
		'no transition timestamp',
	);
	return buildDiagnosticLinks(DiagnosticLinks, trigger, stateChangeTime);
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
