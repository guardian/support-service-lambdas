import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { logger } from '@modules/logger/logger';

dayjs.extend(utc);

export function buildDiagnosticLinks(
	DiagnosticLinks: string | undefined,
	trigger:
		| {
				Period: number;
				EvaluationPeriods: number;
		  }
		| undefined,
	stateChangeTime: Date,
	logsFilterPattern?: string,
): Array<{ link: string; linkText: string }> {
	const diagnosticUrlTemplates = DiagnosticLinks
		? DiagnosticLinks.split(' ').map((link) => ({
				prefix: link.split(':', 1)[0],
				value: link.replace(/^[^:]+:/, ''),
			}))
		: [];

	return diagnosticUrlTemplates.flatMap((diagnosticUrlTemplate) => {
		if (diagnosticUrlTemplate.prefix === 'lambda') {
			const link = getCloudwatchLogsLink(
				`/aws/lambda/${diagnosticUrlTemplate.value}`,
				trigger,
				stateChangeTime,
				logsFilterPattern,
			);
			return [
				{
					link,
					linkText: buildLinkText(
						diagnosticUrlTemplate.value,
						trigger,
						stateChangeTime,
					),
				},
			];
		} else {
			logger.log('unknown DiagnosticLinks tag prefix', diagnosticUrlTemplate);
			return [];
		}
	});
}

// AWS console deep links escape reserved characters using `$` instead of `%`.
// Arbitrary content (e.g. a log filter pattern) must first be percent-encoded
// and then have its `%` characters re-escaped as `$25`.
function encodeForConsoleDeepLink(value: string): string {
	return encodeURIComponent(value).replaceAll('%', '$25');
}

function getCloudwatchLogsLink(
	logGroupName: string,
	Trigger:
		| {
				Period: number;
				EvaluationPeriods: number;
		  }
		| undefined,
	StateChangeTime: Date,
	filterPattern?: string,
): string {
	const assumedTimeForCompositeAlarms = 300;
	// API gateway metrics within a one minute period sometimes seem to be assigned to the next minute datapoint
	const extraTimeForPropagation = 60;
	const alarmCoveredTimeSeconds = Trigger
		? Trigger.EvaluationPeriods * Trigger.Period
		: assumedTimeForCompositeAlarms;
	// alarms only evaluate once a minute so the actual error might have occurred up to a minute earlier
	const alarmEndTimeMillis = (function () {
		const stateChangeForMinute = new Date(StateChangeTime.getTime());
		return stateChangeForMinute.setSeconds(0, 0);
	})();
	const alarmStartTimeMillis =
		alarmEndTimeMillis -
		1000 * (alarmCoveredTimeSeconds + extraTimeForPropagation);

	const cloudwatchLogsBaseUrl =
		'https://eu-west-1.console.aws.amazon.com/cloudwatch/home?region=eu-west-1#logsV2:log-groups/log-group/';
	const encodedFilterPattern = filterPattern
		? encodeForConsoleDeepLink(filterPattern)
		: '';
	const logLink =
		cloudwatchLogsBaseUrl +
		logGroupName.replaceAll('/', '$252F') +
		'/log-events$3Fstart$3D' +
		alarmStartTimeMillis +
		'$26filterPattern$3D' +
		encodedFilterPattern +
		'$26end$3D' +
		alarmEndTimeMillis;

	return logLink;
}

export function buildLinkText(
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

	const startDate = dayjs(new Date(alarmStartTimeMillis)).utc().format('HH:mm');
	const endDate = dayjs(alarmEndTimeMillis).utc().format('HH:mm');

	return `Logs for ${lambdaName} between ${startDate} and ${endDate}`;
}
