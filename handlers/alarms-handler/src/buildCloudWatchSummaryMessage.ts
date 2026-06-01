import { buildAlarmUrl, buildRow, buildText } from './buildRow';

export function buildCloudWatchSummaryMessage(
	teamTotal: number,
	alarmsList: Array<{
		readonly alarmName: string;
		readonly count: number;
	}>,
) {
	return {
		cardsV2: [
			{
				cardId: 'alarm-summary',
				card: {
					header: { title: 'Alarm Summary for Past 7 Days' },
					sections: [
						{
							widgets: [
								buildText(`<b>Total ALARM notifications: ${teamTotal}</b>`),
							],
						},
						buildBreakdownSection(alarmsList),
					],
				},
			},
		],
	};
}

function buildBreakdownSection(
	alarmsList: Array<{
		alarmName: string;
		readonly count: number;
	}>,
) {
	return {
		header: 'Breakdown by alarm',
		widgets: [
			buildRow('<b>Alarm Name</b>', '<b>Count</b>', 'left'),
			...alarmsList.map(({ alarmName, count }) => {
				const alarmUrl = buildAlarmUrl(alarmName);
				return buildRow(
					`<a href="${alarmUrl}">${alarmName}</a>`,
					count.toString(),
					'left',
				);
			}),
		],
	};
}
