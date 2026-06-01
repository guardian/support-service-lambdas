import type { MetricAlarm } from '@aws-sdk/client-cloudwatch';
import { getIfDefined } from '@modules/nullAndUndefined';
import dayjs from 'dayjs';
import { buildDiagnosticLinks } from './buildDiagnosticLinks';
import { buildAlarmUrl, buildText } from './buildRow';

export const buildStuckInAlarmMessage = (
	alarms: Array<{
		alarm: MetricAlarm;
		diagnosticLinks: string | undefined;
	}>,
	now: dayjs.Dayjs,
) => {
	const sections = alarms
		.sort(
			(a, b) =>
				(a.alarm.StateTransitionedTimestamp?.getTime() ?? 0) -
				(b.alarm.StateTransitionedTimestamp?.getTime() ?? 0),
		)
		.map(({ alarm, diagnosticLinks }) => {
			const links = getDiagnosticLinks(diagnosticLinks, alarm);

			const alarmName = getIfDefined(alarm.AlarmName, 'missing alarm name');
			const alarmUrl = buildAlarmUrl(alarmName);

			const enteredAlarmDate = dayjs(alarm.StateTransitionedTimestamp);
			const daysAgo = now.diff(enteredAlarmDate, 'days');
			return {
				header: `🚨 <B>${alarm.AlarmName}</b> <a href="${alarmUrl}">alarm</a>`,
				widgets: [
					buildText(
						`⏰ In alarm for <b>${daysAgo} day${daysAgo > 1 ? 's' : ''}</b> (since ${enteredAlarmDate.utc().format('YYYY-MM-DD HH:mm')})`,
					),
					...links.map(({ link, linkText }) =>
						buildText(`<a href="${link}">${linkText}</a>`),
					),
					buildText(alarm.AlarmDescription ?? ''),
				],
			};
		});

	return {
		cardsV2: [
			{
				cardId: 'stuck-alarms',
				card: {
					header: {
						title: 'These alarms have been going off for more than 24h',
					},
					sections,
				},
			},
		],
	};
};

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
