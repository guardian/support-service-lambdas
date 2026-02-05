export function buildDiagnosticLinks(
	DiagnosticLinks: string | undefined,
	trigger:
		| {
				Period: number;
				EvaluationPeriods: number;
		  }
		| undefined,
	stateChangeTime: Date,
): Array<{ link: string; lambda: string }> {
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
			);
			return [
				{
					lambda: diagnosticUrlTemplate.value,
					link,
				},
			];
		} else {
			console.log('unknown DiagnosticLinks tag prefix', diagnosticUrlTemplate);
			return [];
		}
	});
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
	const logLink =
		cloudwatchLogsBaseUrl +
		logGroupName.replaceAll('/', '$252F') +
		'/log-events$3Fstart$3D' +
		alarmStartTimeMillis +
		'$26filterPattern$3D$26end$3D' +
		alarmEndTimeMillis;

	return logLink;
}
